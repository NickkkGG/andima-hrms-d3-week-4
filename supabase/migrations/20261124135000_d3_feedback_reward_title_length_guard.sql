-- Keep new Feedback & Reward titles compact enough for every D3 presentation.
-- NOT VALID preserves legacy data while enforcing the limit for future writes.

begin;

alter table public.d3_employee_feedback
  drop constraint if exists d3_feedback_title_length;

alter table public.d3_employee_feedback
  add constraint d3_feedback_title_length
  check (char_length(title) <= 120) not valid;

alter table public.d3_employee_rewards
  drop constraint if exists d3_reward_title_length,
  drop constraint if exists d3_reward_name_length;

alter table public.d3_employee_rewards
  add constraint d3_reward_title_length
  check (char_length(title) <= 120) not valid,
  add constraint d3_reward_name_length
  check (reward_name is null or char_length(reward_name) <= 120) not valid;

commit;
