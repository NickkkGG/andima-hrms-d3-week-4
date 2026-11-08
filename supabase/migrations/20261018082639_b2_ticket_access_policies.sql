-- Ticket authorization is based on B2 account role and the account's exact
-- email-linked operational identity. d3_user_access is no longer consulted.

drop policy if exists "D3 users read allowed tickets" on public.d3_tickets;
create policy "B2 users read allowed tickets"
  on public.d3_tickets
  for select
  to authenticated
  using (
    employee_id = public.d3_current_legacy_employee_uuid()
    or public.d3_current_role() in ('HR'::public.d3_app_role, 'MANAGER'::public.d3_app_role)
  );

drop policy if exists "Employees create their own tickets" on public.d3_tickets;
create policy "B2 employees create their own tickets"
  on public.d3_tickets
  for insert
  to authenticated
  with check (
    employee_id = public.d3_current_legacy_employee_uuid()
    and public.d3_current_role() = 'EMPLOYEE'::public.d3_app_role
  );

drop policy if exists "HR and managers update ticket status" on public.d3_tickets;
create policy "B2 HR and managers update ticket status"
  on public.d3_tickets
  for update
  to authenticated
  using (public.d3_current_role() in ('HR'::public.d3_app_role, 'MANAGER'::public.d3_app_role))
  with check (public.d3_current_role() in ('HR'::public.d3_app_role, 'MANAGER'::public.d3_app_role));

drop policy if exists "D3 users read allowed ticket history" on public.d3_ticket_history;
create policy "B2 users read allowed ticket history"
  on public.d3_ticket_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.d3_tickets ticket
      where ticket.id = d3_ticket_history.ticket_id
        and (
          ticket.employee_id = public.d3_current_legacy_employee_uuid()
          or public.d3_current_role() in ('HR'::public.d3_app_role, 'MANAGER'::public.d3_app_role)
        )
    )
  );

drop policy if exists "D3 users read allowed follow-ups" on public.d3_ticket_followups;
create policy "B2 users read allowed follow-ups"
  on public.d3_ticket_followups
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.d3_tickets ticket
      where ticket.id = d3_ticket_followups.ticket_id
        and (
          ticket.employee_id = public.d3_current_legacy_employee_uuid()
          or public.d3_current_role() in ('HR'::public.d3_app_role, 'MANAGER'::public.d3_app_role)
        )
    )
  );

drop policy if exists "HR and managers add their own follow-ups" on public.d3_ticket_followups;
create policy "B2 HR and managers add their own follow-ups"
  on public.d3_ticket_followups
  for insert
  to authenticated
  with check (
    actor_employee_id = public.d3_current_legacy_employee_uuid()
    and public.d3_current_role() in ('HR'::public.d3_app_role, 'MANAGER'::public.d3_app_role)
  );
