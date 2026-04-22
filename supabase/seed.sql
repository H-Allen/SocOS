do $$
declare
  alice_id uuid := gen_random_uuid();
  bob_id uuid := gen_random_uuid();
  chloe_id uuid := gen_random_uuid();
  dan_id uuid := gen_random_uuid();
  eve_id uuid := gen_random_uuid();
  org_id uuid := gen_random_uuid();
  secretary_handover_id uuid := gen_random_uuid();
  meeting_id uuid := gen_random_uuid();
  next_monday_start timestamptz;
  days_until_monday int := ((8 - extract(isodow from now())::int) % 7);
begin
  if days_until_monday = 0 then
    days_until_monday := 7;
  end if;

  next_monday_start := date_trunc('day', now()) + (days_until_monday * interval '1 day') + interval '18 hours';

  delete from auth.users
  where email in (
    'alice@ed.ac.uk',
    'bob@ed.ac.uk',
    'chloe@ed.ac.uk',
    'dan@ed.ac.uk',
    'eve@ed.ac.uk'
  );

  delete from public.organizations
  where name = 'HYPED';

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values
    (
      alice_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'alice@ed.ac.uk',
      crypt('societyos-demo', gen_salt('bf')),
      now() - interval '90 days',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Alice MacLeod"}'::jsonb,
      now() - interval '90 days',
      now() - interval '90 days'
    ),
    (
      bob_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'bob@ed.ac.uk',
      crypt('societyos-demo', gen_salt('bf')),
      now() - interval '86 days',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Bob Fraser"}'::jsonb,
      now() - interval '86 days',
      now() - interval '86 days'
    ),
    (
      chloe_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'chloe@ed.ac.uk',
      crypt('societyos-demo', gen_salt('bf')),
      now() - interval '84 days',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Chloe Murray"}'::jsonb,
      now() - interval '84 days',
      now() - interval '84 days'
    ),
    (
      dan_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dan@ed.ac.uk',
      crypt('societyos-demo', gen_salt('bf')),
      now() - interval '81 days',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Dan Campbell"}'::jsonb,
      now() - interval '81 days',
      now() - interval '81 days'
    ),
    (
      eve_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'eve@ed.ac.uk',
      crypt('societyos-demo', gen_salt('bf')),
      now() - interval '78 days',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Eve Sinclair"}'::jsonb,
      now() - interval '78 days',
      now() - interval '78 days'
    );

  insert into public.users (id, full_name, email, created_at)
  values
    (alice_id, 'Alice MacLeod', 'alice@ed.ac.uk', now() - interval '90 days'),
    (bob_id, 'Bob Fraser', 'bob@ed.ac.uk', now() - interval '86 days'),
    (chloe_id, 'Chloe Murray', 'chloe@ed.ac.uk', now() - interval '84 days'),
    (dan_id, 'Dan Campbell', 'dan@ed.ac.uk', now() - interval '81 days'),
    (eve_id, 'Eve Sinclair', 'eve@ed.ac.uk', now() - interval '78 days');

  insert into public.organizations (id, name, university, type, created_by, created_at)
  values (
    org_id,
    'HYPED',
    'University of Edinburgh',
    'engineering_team',
    alice_id,
    now() - interval '75 days'
  );

  insert into public.memberships (user_id, organization_id, role, permission_level, joined_at)
  values
    (alice_id, org_id, 'president', 'admin', now() - interval '75 days'),
    (bob_id, org_id, 'secretary', 'committee', now() - interval '74 days'),
    (chloe_id, org_id, 'treasurer', 'committee', now() - interval '74 days'),
    (dan_id, org_id, 'committee', 'committee', now() - interval '73 days'),
    (eve_id, org_id, 'member', 'member', now() - interval '72 days');

  insert into public.tasks (
    organization_id,
    title,
    description,
    assigned_to,
    created_by,
    due_date,
    status,
    priority,
    created_at
  )
  values
    (
      org_id,
      'Submit sponsorship proposal to Siemens',
      'Finalize the tailored sponsorship pitch, review the budget ask, and send the proposal before the outreach window closes.',
      bob_id,
      alice_id,
      (current_date + interval '5 days')::date,
      'in_progress',
      'high',
      now() - interval '3 days'
    ),
    (
      org_id,
      'Book venue for annual showcase',
      'Confirm the preferred venue, lock in AV requirements, and hold the room before term calendars fill up.',
      alice_id,
      alice_id,
      (current_date + interval '14 days')::date,
      'todo',
      'high',
      now() - interval '2 days'
    ),
    (
      org_id,
      'Prepare Q2 financial report',
      'Pull spend data, reconcile sponsorship income, and prepare the committee summary for next week''s review.',
      chloe_id,
      alice_id,
      (current_date + interval '7 days')::date,
      'todo',
      'medium',
      now() - interval '2 days'
    ),
    (
      org_id,
      'Design new team jersey',
      'Create updated jersey concepts for sponsor approval and showcase them at the next branding check-in.',
      dan_id,
      alice_id,
      (current_date + interval '21 days')::date,
      'todo',
      'low',
      now() - interval '1 day'
    ),
    (
      org_id,
      'Update website about us page',
      'Refresh the team profile, leadership section, and current season positioning statement.',
      eve_id,
      bob_id,
      (current_date - interval '6 days')::date,
      'done',
      'low',
      now() - interval '16 days'
    ),
    (
      org_id,
      'Write meeting minutes from 14 Jan',
      'Finalize the committee minutes, circulate actions, and file the notes in the official record folder.',
      bob_id,
      alice_id,
      (current_date - interval '10 days')::date,
      'done',
      'medium',
      now() - interval '18 days'
    );

  insert into public.meetings (
    id,
    organization_id,
    title,
    description,
    start_time,
    end_time,
    created_by,
    created_at
  )
  values (
    meeting_id,
    org_id,
    'Term 2 Kickoff Meeting',
    'Review semester goals, assign roles, plan showcase event.',
    next_monday_start,
    next_monday_start + interval '2 hours',
    alice_id,
    now() - interval '1 day'
  );

  insert into public.meeting_notes (meeting_id, content, created_at)
  values (
    meeting_id,
    'Discussed sponsorship pipeline. Bob to follow up with Siemens by Friday. Venue shortlist down to 3 options.',
    now() - interval '20 hours'
  );

  insert into public.handovers (
    id,
    organization_id,
    role_name,
    responsibilities,
    annual_timeline,
    key_contacts,
    advice,
    mistakes,
    content,
    checklist,
    completion_percent,
    updated_at
  )
  values (
    secretary_handover_id,
    org_id,
    'Secretary',
    'Manage all internal and external communications. Take minutes at every committee meeting. Maintain the society''s official records and email inbox.',
    '{"January":["Prepare committee handover pack"],"February":[],"March":["Draft AGM agenda"],"April":[],"May":["Coordinate end-of-year records transfer"],"June":[],"July":[],"August":[],"September":["Set up inbox labels for the new term"],"October":["Publish weekly internal updates"],"November":["Prepare annual records archive"],"December":["Summarize term actions before break"]}',
    '[{"name":"Alice MacLeod","role":"President","email":"alice@ed.ac.uk","phone":"+44 7700 900001"},{"name":"Students'' Association Activities Team","role":"University contact","email":"societies@eusa.ed.ac.uk","phone":"+44 131 650 0000"}]',
    'Set up email filters immediately. The inbox gets overwhelming fast. Create a folder system from week one.',
    'Don''t leave meeting minutes for more than 48 hours — you forget everything. Always BCC the President on formal external emails.',
    jsonb_build_object(
      'rolePurpose', 'Manage all internal and external communications. Take minutes at every committee meeting. Maintain the society''s official records and email inbox.',
      'recurringResponsibilities', jsonb_build_array(
        'Check the official inbox every weekday and triage external messages',
        'Draft and send committee agendas 48 hours before each meeting',
        'Publish minutes and actions within 48 hours of every committee meeting'
      ),
      'annualTimeline', jsonb_build_object(
        'January', jsonb_build_array('Prepare committee handover pack'),
        'February', jsonb_build_array(),
        'March', jsonb_build_array('Draft AGM agenda'),
        'April', jsonb_build_array(),
        'May', jsonb_build_array('Coordinate end-of-year records transfer'),
        'June', jsonb_build_array(),
        'July', jsonb_build_array(),
        'August', jsonb_build_array(),
        'September', jsonb_build_array('Set up inbox labels for the new term'),
        'October', jsonb_build_array('Publish weekly internal updates'),
        'November', jsonb_build_array('Prepare annual records archive'),
        'December', jsonb_build_array('Summarize term actions before break')
      ),
      'importantDocuments', jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid()::text, 'title', 'Committee contact sheet', 'url', 'https://example.com/hyped-contacts'),
        jsonb_build_object('id', gen_random_uuid()::text, 'title', 'Minutes archive', 'url', 'https://example.com/hyped-minutes')
      ),
      'keyContacts', jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Alice MacLeod', 'role', 'President', 'email', 'alice@ed.ac.uk', 'phone', '+44 7700 900001'),
        jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Students'' Association Activities Team', 'role', 'University contact', 'email', 'societies@eusa.ed.ac.uk', 'phone', '+44 131 650 0000')
      ),
      'adviceFromPreviousHolder', 'Set up email filters immediately. The inbox gets overwhelming fast. Create a folder system from week one.',
      'mistakesToAvoid', jsonb_build_array(
        'Don''t leave meeting minutes for more than 48 hours — you forget everything.',
        'Always BCC the President on formal external emails.'
      ),
      'handoverChecklist', jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid()::text, 'text', 'Transfer email access', 'completed', true, 'dueDate', ''),
        jsonb_build_object('id', gen_random_uuid()::text, 'text', 'Share Google Drive folder', 'completed', true, 'dueDate', ''),
        jsonb_build_object('id', gen_random_uuid()::text, 'text', 'Introduce to university contacts', 'completed', false, 'dueDate', ''),
        jsonb_build_object('id', gen_random_uuid()::text, 'text', 'Complete 1-hour handover call', 'completed', false, 'dueDate', ''),
        jsonb_build_object('id', gen_random_uuid()::text, 'text', 'Hand over physical society documents', 'completed', false, 'dueDate', '')
      )
    ),
    jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'text', 'Transfer email access', 'completed', true, 'dueDate', ''),
      jsonb_build_object('id', gen_random_uuid()::text, 'text', 'Share Google Drive folder', 'completed', true, 'dueDate', ''),
      jsonb_build_object('id', gen_random_uuid()::text, 'text', 'Introduce to university contacts', 'completed', false, 'dueDate', ''),
      jsonb_build_object('id', gen_random_uuid()::text, 'text', 'Complete 1-hour handover call', 'completed', false, 'dueDate', ''),
      jsonb_build_object('id', gen_random_uuid()::text, 'text', 'Hand over physical society documents', 'completed', false, 'dueDate', '')
    ),
    100,
    now() - interval '12 hours'
  );

  insert into public.resources (
    organization_id,
    title,
    description,
    content,
    type,
    category,
    file_url,
    external_url,
    tags,
    uploaded_by,
    created_at
  )
  values
    (
      org_id,
      'Sponsorship Deck 2024–25',
      'Latest sponsor-facing pitch deck covering team performance, exposure, and support packages.',
      null,
      'file',
      'Sponsorship',
      'https://example.com/sponsorship-deck-2024-25.pdf',
      null,
      array['sponsorship', 'deck', '2024'],
      bob_id,
      now() - interval '8 days'
    ),
    (
      org_id,
      'Constitution v3',
      'Current working constitution for governance, officer responsibilities, and voting process.',
      null,
      'link',
      'Governance',
      null,
      'https://example.com/constitution',
      array['governance', 'constitution'],
      alice_id,
      now() - interval '21 days'
    );

  insert into public.announcements (
    organization_id,
    title,
    content,
    pinned,
    created_by,
    created_at
  )
  values
    (
      org_id,
      'Welcome back for Term 2!',
      'We''re back in the workshop next week. Please check the kickoff meeting details, confirm your availability, and review the top priorities for the showcase term.',
      true,
      alice_id,
      now() - interval '2 days'
    ),
    (
      org_id,
      'Sponsorship deadline reminder',
      'Please send any sponsor deck edits to Bob by Thursday evening so the Siemens proposal can go out on time.',
      false,
      bob_id,
      now() - interval '18 hours'
    );

  insert into public.activity_logs (organization_id, actor_user_id, action, metadata, created_at)
  values
    (
      org_id,
      alice_id,
      'seeded the HYPED demo workspace',
      jsonb_build_object('seed', 'hyped-demo'),
      now() - interval '10 minutes'
    );
end $$;
