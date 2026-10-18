-- Normalize the D3 ticket workflow while preserving existing tickets and history.
-- Existing enum values are renamed in place, so historic rows retain their meaning.

alter type public.d3_ticket_status rename value 'SUBMITTED' to 'PENDING';
alter type public.d3_ticket_status rename value 'IN_REVIEW' to 'TODO';

create type public.d3_ticket_priority as enum ('LOW', 'NORMAL', 'HIGH');

alter table public.d3_tickets
  add column priority public.d3_ticket_priority not null default 'NORMAL',
  add column due_at timestamptz;

create index d3_tickets_open_due_at_idx
  on public.d3_tickets (due_at asc)
  where status not in ('RESOLVED', 'REJECTED');

create index d3_tickets_priority_created_idx
  on public.d3_tickets (priority, created_at desc);

alter table public.d3_ticket_history
  drop constraint if exists d3_ticket_history_event_type_check;

alter table public.d3_ticket_history
  add constraint d3_ticket_history_event_type_check
  check (event_type in ('CREATED', 'STATUS_CHANGED', 'FOLLOW_UP_ADDED', 'PRIORITY_CHANGED', 'DUE_DATE_CHANGED'));

create or replace function private.d3_protect_ticket_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ticket_code is distinct from old.ticket_code
     or new.employee_id is distinct from old.employee_id
     or new.title is distinct from old.title
     or new.category is distinct from old.category
     or new.description is distinct from old.description
     or new.occurred_at is distinct from old.occurred_at
     or new.created_at is distinct from old.created_at then
    raise exception 'Only ticket workflow fields may be updated after creation';
  end if;

  if new.status is not distinct from old.status
     and new.priority is not distinct from old.priority
     and new.due_at is not distinct from old.due_at then
    raise exception 'At least one ticket workflow field must change when updating a ticket';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.d3_write_ticket_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_actor uuid;
begin
  if tg_table_name = 'd3_tickets' and tg_op = 'INSERT' then
    insert into public.d3_ticket_history (
      ticket_id, actor_employee_id, event_type, to_status
    ) values (
      new.id, new.employee_id, 'CREATED', new.status
    );
    return new;
  end if;

  if tg_table_name = 'd3_tickets' and tg_op = 'UPDATE' then
    select employee_id into current_actor
    from public.d3_user_access
    where auth_user_id = auth.uid();

    if current_actor is null then
      raise exception 'Authenticated D3 user mapping is required for an audit entry';
    end if;

    if new.status is distinct from old.status then
      insert into public.d3_ticket_history (
        ticket_id, actor_employee_id, event_type, from_status, to_status
      ) values (
        new.id, current_actor, 'STATUS_CHANGED', old.status, new.status
      );
    end if;

    if new.priority is distinct from old.priority then
      insert into public.d3_ticket_history (
        ticket_id, actor_employee_id, event_type, note
      ) values (
        new.id, current_actor, 'PRIORITY_CHANGED', 'Priority changed to ' || new.priority::text
      );
    end if;

    if new.due_at is distinct from old.due_at then
      insert into public.d3_ticket_history (
        ticket_id, actor_employee_id, event_type, note
      ) values (
        new.id, current_actor, 'DUE_DATE_CHANGED',
        case when new.due_at is null then 'Due date cleared' else 'Due date updated' end
      );
    end if;

    return new;
  end if;

  if tg_table_name = 'd3_ticket_followups' and tg_op = 'INSERT' then
    insert into public.d3_ticket_history (
      ticket_id, actor_employee_id, event_type, note
    ) values (
      new.ticket_id, new.actor_employee_id, 'FOLLOW_UP_ADDED', new.note
    );
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists d3_tickets_audit on public.d3_tickets;
create trigger d3_tickets_audit
after insert or update of status, priority, due_at on public.d3_tickets
for each row execute function private.d3_write_ticket_history();

revoke all on function private.d3_protect_ticket_update() from public, anon, authenticated;
revoke all on function private.d3_write_ticket_history() from public, anon, authenticated;
