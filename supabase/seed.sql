-- =========================================================================
-- Builder Clans — Seed data for development
--
-- Master plan §100: 30 users, 20 projects, 50 skills, 30 project roles,
-- 10 matches, 4 trials, 5 clans.
--
-- This file does NOT create auth users (those live in auth.users and require
-- Supabase admin). It seeds the *profile* and project data assuming the
-- auth.users rows already exist with stable UUIDs.
--
-- For a local demo: run scripts/seed.ts which inserts auth users + profiles
-- atomically.
-- =========================================================================

-- Skills taxonomy (canonical list — used by config/matching.ts)
-- This is documentation; the runtime list lives in TS.
-- update public.profile_skills etc. accordingly.

-- 30 demo profiles (UUIDs are placeholders — the TS seed script mints real ones)
insert into public.profiles (id, username, display_name, avatar_url, bio, headline, user_type, institution, location, country_code, weekly_hours, remote_preference, builder_xp, builder_level, reputation_score, onboarding_completed)
values
  ('00000000-0000-0000-0000-000000000001','ahmet_yilmaz','Ahmet Yılmaz',null,'ML engineer focused on healthcare AI','CS student · Loves medical imaging','STUDENT','ITU','Istanbul','TR','10_TO_20','REMOTE',420,3,72,true),
  ('00000000-0000-0000-0000-000000000002','elif_kaya','Elif Kaya',null,'Medical student exploring AI diagnostics','Med school + research','STUDENT','Hacettepe','Ankara','TR','5_TO_10','REMOTE',180,2,58,true),
  ('00000000-0000-0000-0000-000000000003','sarah_chen','Sarah Chen',null,'Robotics engineer, ROS + sim','Robotics engineer','ENGINEER','CMU','Pittsburgh','US','10_TO_20','HYBRID',1100,5,89,true),
  ('00000000-0000-0000-0000-000000000004','jonas_muller','Jonas Müller',null,'Mechanical design + 3D print','Mech designer','ENGINEER','TU Munich','Munich','DE','5_TO_10','REMOTE',320,3,65,true),
  ('00000000-0000-0000-0000-000000000005','priya_patel','Priya Patel',null,'Bioinformatics PhD','Researcher','RESEARCHER','IIT Bombay','Mumbai','IN','10_TO_20','REMOTE',900,4,82,true),
  ('00000000-0000-0000-0000-000000000006','marco_rossi','Marco Rossi',null,'Indie hacker building dev tools','Indie hacker','FOUNDER',null,'Milan','IT','20_PLUS','REMOTE',2400,7,95,true),
  ('00000000-0000-0000-0000-000000000007','zoe_park','Zoe Park',null,'Designer & prototyper','Product designer','DESIGNER','KAIST','Daejeon','KR','10_TO_20','REMOTE',510,3,71,true),
  ('00000000-0000-0000-0000-000000000008','omar_hassan','Omar Hassan',null,'Embedded systems + firmware','Embedded engineer','ENGINEER','AUC','Cairo','EG','5_TO_10','REMOTE',250,3,63,true),
  ('00000000-0000-0000-0000-000000000009','lina_santos','Lina Santos',null,'Frontend + React + a11y','Frontend dev','ENGINEER',null,'Lisbon','PT','10_TO_20','REMOTE',680,3,74,true),
  ('00000000-0000-0000-0000-000000000010','kenji_tanaka','Kenji Tanaka',null,'Robotics perception + SLAM','Robotics engineer','ENGINEER','Tokyo Tech','Tokyo','JP','20_PLUS','REMOTE',1500,6,87,true),
  ('00000000-0000-0000-0000-000000000011','amelia_brown','Amelia Brown',null,'Climate tech + ML','Founder','FOUNDER','Imperial','London','UK','20_PLUS','HYBRID',2100,6,90,true),
  ('00000000-0000-0000-0000-000000000012','raj_iyer','Raj Iyer',null,'Full-stack + DevOps','Full-stack dev','ENGINEER','IIT Delhi','Delhi','IN','10_TO_20','REMOTE',470,3,69,true),
  ('00000000-0000-0000-0000-000000000013','noor_abadi','Noor Abadi',null,'Game dev + Unity','Game dev','DESIGNER','AUB','Beirut','LB','5_TO_10','REMOTE',220,2,60,true),
  ('00000000-0000-0000-0000-000000000014','tomas_sven','Tomas Sven',null,'NLP researcher','Researcher','RESEARCHER','KTH','Stockholm','SE','10_TO_20','REMOTE',780,4,77,true),
  ('00000000-0000-0000-0000-000000000015','hana_kim','Hana Kim',null,'Cybersecurity + reverse engineering','Security engineer','ENGINEER','Seoul Nat Univ','Seoul','KR','10_TO_20','REMOTE',610,3,72,true),
  ('00000000-0000-0000-0000-000000000016','lucas_martinez','Lucas Martínez',null,'Mobile dev + iOS','Mobile dev','ENGINEER','ITAM','Mexico City','MX','5_TO_10','REMOTE',340,3,66,true),
  ('00000000-0000-0000-0000-000000000017','maya_levin','Maya Levin',null,'Hardware + PCB design','Hardware engineer','ENGINEER','Technion','Haifa','IL','5_TO_10','HYBRID',290,2,62,true),
  ('00000000-0000-0000-0000-000000000018','fabio_oliveira','Fábio Oliveira',null,'Data engineering + pipelines','Data engineer','ENGINEER','USP','São Paulo','BR','10_TO_20','REMOTE',560,3,70,true),
  ('00000000-0000-0000-0000-000000000019','ines_dubois','Inès Dubois',null,'Product design + research','Designer','DESIGNER','HEC Paris','Paris','FR','5_TO_10','REMOTE',410,3,68,true),
  ('00000000-0000-0000-0000-000000000020','yusuf_demir','Yusuf Demir',null,'CS student — systems programming','CS student','STUDENT','YTU','Istanbul','TR','5_TO_10','REMOTE',80,1,55,true),
  ('00000000-0000-0000-0000-000000000021','aiyana_ross','Aiyana Ross',null,'Climate researcher','Researcher','RESEARCHER','Stanford','Palo Alto','US','10_TO_20','HYBRID',830,4,79,true),
  ('00000000-0000-0000-0000-000000000022','ben_stein','Ben Stein',null,'Full-stack TypeScript','Full-stack dev','ENGINEER',null,'Berlin','DE','20_PLUS','REMOTE',1300,5,84,true),
  ('00000000-0000-0000-0000-000000000023','chiara_bianchi','Chiara Bianchi',null,'Biotech + protein design','Researcher','RESEARCHER','ETH','Zurich','CH','10_TO_20','HYBRID',710,4,76,true),
  ('00000000-0000-0000-0000-000000000024','dev_kapoor','Dev Kapoor',null,'Fintech + risk modeling','Engineer','ENGINEER','IIT Kanpur','Bangalore','IN','20_PLUS','REMOTE',1200,5,83,true),
  ('00000000-0000-0000-0000-000000000025','eva_schmidt','Eva Schmidt',null,'Pedagogy + EdTech','Designer','DESIGNER','TU Berlin','Berlin','DE','5_TO_10','REMOTE',260,2,61,true),
  ('00000000-0000-0000-0000-000000000026','finn_olafur','Finn Oláfur',null,'Game AI engineer','Engineer','ENGINEER','Reykjavik Univ','Reykjavik','IS','10_TO_20','REMOTE',470,3,69,true),
  ('00000000-0000-0000-0000-000000000027','gabriela_pereira','Gabriela Pereira',null,'Medical imaging PhD','Researcher','RESEARCHER','USP','Ribeirão Preto','BR','10_TO_20','REMOTE',690,4,75,true),
  ('00000000-0000-0000-0000-000000000028','haruto_sato','Haruto Sato',null,'Robotics + control systems','Engineer','ENGINEER','Osaka Univ','Osaka','JP','10_TO_20','REMOTE',870,4,80,true),
  ('00000000-0000-0000-0000-000000000029','irene_papadakis','Irene Papadakis',null,'Climate policy + data','Researcher','RESEARCHER','NTUA','Athens','GR','5_TO_10','REMOTE',230,2,59,true),
  ('00000000-0000-0000-0000-000000000030','jamal_ali','Jamal Ali',null,'Indie hacker + community builder','Founder','FOUNDER',null,'Dubai','AE','10_TO_20','REMOTE',520,3,70,true)
on conflict (id) do nothing;

-- Profile skills (representative)
insert into public.profile_skills (profile_id, skill) values
  ('00000000-0000-0000-0000-000000000001','Python'),
  ('00000000-0000-0000-0000-000000000001','PyTorch'),
  ('00000000-0000-0000-0000-000000000001','Computer Vision'),
  ('00000000-0000-0000-0000-000000000002','Radiology'),
  ('00000000-0000-0000-0000-000000000002','Medical Imaging'),
  ('00000000-0000-0000-0000-000000000003','ROS'),
  ('00000000-0000-0000-0000-000000000003','Robotics'),
  ('00000000-0000-0000-0000-000000000003','C++'),
  ('00000000-0000-0000-0000-000000000007','Figma'),
  ('00000000-0000-0000-0000-000000000007','Product Design'),
  ('00000000-0000-0000-0000-000000000009','React'),
  ('00000000-0000-0000-0000-000000000009','TypeScript'),
  ('00000000-0000-0000-0000-000000000022','TypeScript'),
  ('00000000-0000-0000-0000-000000000022','PostgreSQL'),
  ('00000000-0000-0000-0000-000000000022','Node.js')
on conflict do nothing;

insert into public.profile_interests (profile_id, interest) values
  ('00000000-0000-0000-0000-000000000001','Healthcare AI'),
  ('00000000-0000-0000-0000-000000000001','Robotics'),
  ('00000000-0000-0000-0000-000000000003','Robotics'),
  ('00000000-0000-0000-0000-000000000003','Open Source'),
  ('00000000-0000-0000-0000-000000000006','Developer Tools'),
  ('00000000-0000-0000-0000-000000000006','Indie Hacking'),
  ('00000000-0000-0000-0000-000000000011','Climate')
on conflict do nothing;

-- 20 demo projects
insert into public.projects (id, owner_id, slug, title, short_description, description, category, stage, visibility, remote_mode, location, weekly_commitment_min, weekly_commitment_max, tags, status, github_url, demo_url)
values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','lung-ct-ai','Lung CT AI','AI model that detects lung nodules from CT scans.','Building a 3D-CNN pipeline on LIDC-IDRI with calibrated thresholds for clinical handoff. Looking for a radiologist collaborator and a frontend engineer.','HEALTHCARE','BUILDING','PUBLIC','REMOTE','Istanbul',5,15,array['healthcare','medical-imaging','3d-cnn'],'ACTIVE',null,null),
  ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','warehouse-vision','Warehouse Vision','Vision system for warehouse package classification.','A perception pipeline for a logistics robotics client. ROS2, ZED 2, ONNX runtime, real-time tracking.','ROBOTICS','PROTOTYPE','PUBLIC','HYBRID','Pittsburgh',8,20,array['vision','ros2','logistics'],'ACTIVE','https://github.com/example/warehouse-vision',null),
  ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000010','drone-slam','Drone SLAM','Real-time SLAM for indoor drone navigation.','LIO-SAM + Intel Realsense + custom loop closure.','ROBOTICS','BUILDING','PUBLIC','REMOTE','Tokyo',10,20,array['slam','ros','lidar'],'ACTIVE','https://github.com/example/drone-slam',null),
  ('10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000003','robot-arm','Open Robot Arm','6-DoF robot arm with open firmware.','Designing an affordable 6-DoF arm. Cycloidal reducers, BLDC motors, ROS2 driver.','ROBOTICS','PROTOTYPE','PUBLIC','HYBRID','Munich',6,15,array['hardware','robotics','mechanical'],'ACTIVE',null,null),
  ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000005','protein-ai','Protein AI','Predicting protein structure for under-studied enzymes.','Using ESM-2 + AlphaFold-Multimer with custom MSA pipeline.','BIOTECHNOLOGY','VALIDATING','PUBLIC','REMOTE','Mumbai',8,15,array['protein','ml','biology'],'ACTIVE','https://github.com/example/protein-ai',null),
  ('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000006','devtool-1','Local-First Notebooks','A markdown-native notebook that syncs locally-first.','Built on CRDTs. Looking for a designer and a TS dev.','DEVELOPER_TOOLS','PROTOTYPE','PUBLIC','REMOTE','Milan',10,25,array['crdt','typescript','local-first'],'ACTIVE',null,'https://demo.example.com'),
  ('10000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000011','climate-saas','Carbon Tracker','SaaS for SMBs to track and reduce carbon.','GHG protocol scope 1/2/3 calculator + recommendations engine.','CLIMATE','BUILDING','PUBLIC','HYBRID','London',10,20,array['climate','saas','ghg'],'ACTIVE',null,null),
  ('10000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000012','fintech-risk','Real-time Risk Engine','Streaming risk engine for retail trading.','Kafka + Flink + Rust core.','FINTECH','VALIDATING','PUBLIC','REMOTE','Delhi',10,20,array['fintech','streaming','rust'],'ACTIVE',null,null),
  ('10000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000013','indie-game','Frostpunk-ish city builder','A solo-dev city builder with survival mechanics.','Unity 2023 + DOTS.','GAMING','PROTOTYPE','PUBLIC','REMOTE','Beirut',5,15,array['unity','game','indie'],'ACTIVE',null,'https://demo.example.com'),
  ('10000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000014','nlp-research','Nuanced Translation','Low-resource language translation research.','Continued pretraining on small corpora.','RESEARCH','VALIDATING','PUBLIC','REMOTE','Stockholm',8,15,array['nlp','research','translation'],'ACTIVE',null,null),
  ('10000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000015','security-1','Threat Intel Pipeline','Aggregator + scoring for emerging CVEs.','ELK + custom scoring.','CYBERSECURITY','BUILDING','PUBLIC','REMOTE','Seoul',5,15,array['security','elk','cve'],'ACTIVE',null,null),
  ('10000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000017','hardware-1','Open Bench Power Supply','Open-source 0-30V bench PSU.','KiCad + STM32 firmware.','HARDWARE','PROTOTYPE','PUBLIC','HYBRID','Haifa',4,12,array['hardware','pcb','firmware'],'ACTIVE',null,null),
  ('10000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000018','data-pipeline','Warehouse Modernization','Migrating a legacy warehouse to Snowflake + dbt.','Data engineering.','DEVELOPER_TOOLS','BUILDING','PUBLIC','REMOTE','São Paulo',10,20,array['data','dbt','snowflake'],'ACTIVE',null,null),
  ('10000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000019','edtech-app','Reading Coach','Adaptive reading app for grade 3-5.','Pedagogy + LLMs.','EDUCATION','VALIDATING','PUBLIC','REMOTE','Paris',5,15,array['edtech','nlp','kids'],'ACTIVE',null,'https://demo.example.com'),
  ('10000000-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000020','chatbot-1','Open-Source Chatbot Framework','A self-hostable chatbot framework.','TS + Postgres + pgvector.','DEVELOPER_TOOLS','BUILDING','PUBLIC','REMOTE','Istanbul',5,15,array['chatbot','llm','typescript'],'ACTIVE','https://github.com/example/chatbot',null),
  ('10000000-0000-0000-0000-000000000016','00000000-0000-0000-0000-000000000021','climate-ml','Permafrost ML','Predicting permafrost thaw from satellite imagery.','Climate research project.','RESEARCH','PROTOTYPE','PUBLIC','HYBRID','Palo Alto',8,15,array['climate','ml','satellite'],'ACTIVE',null,null),
  ('10000000-0000-0000-0000-000000000017','00000000-0000-0000-0000-000000000023','protein-design','Enzyme Design','Designing novel enzymes for plastic degradation.','Computational biology.','BIOTECHNOLOGY','VALIDATING','PUBLIC','HYBRID','Zurich',8,15,array['protein','biology','design'],'ACTIVE',null,null),
  ('10000000-0000-0000-0000-000000000018','00000000-0000-0000-0000-000000000024','marketplace','SMB Lending','ML-driven credit scoring for SMB lending.','Fintech.','FINTECH','BUILDING','PUBLIC','REMOTE','Bangalore',10,20,array['fintech','ml','lending'],'ACTIVE',null,null),
  ('10000000-0000-0000-0000-000000000019','00000000-0000-0000-0000-000000000026','game-ai','NPC Behavior Trees','Behavior tree library for game AI.','Open source.','GAMING','PROTOTYPE','PUBLIC','REMOTE','Reykjavik',5,12,array['game-ai','behavior-trees'],'ACTIVE','https://github.com/example/btrees',null),
  ('10000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000030','community-1','Builder Network Mobile','A mobile-first wrapper for Builder Clans.','PWA.','CONSUMER','IDEA','PUBLIC','REMOTE','Dubai',4,12,array['pwa','mobile','community'],'ACTIVE',null,null)
on conflict (id) do nothing;

-- Project skills
insert into public.project_skills (project_id, skill) values
  ('10000000-0000-0000-0000-000000000001','Python'),
  ('10000000-0000-0000-0000-000000000001','PyTorch'),
  ('10000000-0000-0000-0000-000000000001','Medical Imaging'),
  ('10000000-0000-0000-0000-000000000001','React'),
  ('10000000-0000-0000-0000-000000000002','Python'),
  ('10000000-0000-0000-0000-000000000002','ROS'),
  ('10000000-0000-0000-0000-000000000002','Computer Vision'),
  ('10000000-0000-0000-0000-000000000003','ROS'),
  ('10000000-0000-0000-0000-000000000003','C++'),
  ('10000000-0000-0000-0000-000000000003','Robotics'),
  ('10000000-0000-0000-0000-000000000004','Mechanical Design'),
  ('10000000-0000-0000-0000-000000000004','CAD'),
  ('10000000-0000-0000-0000-000000000004','Embedded Systems'),
  ('10000000-0000-0000-0000-000000000006','TypeScript'),
  ('10000000-0000-0000-0000-000000000006','React'),
  ('10000000-0000-0000-0000-000000000006','Product Design')
on conflict do nothing;

-- Project members (owners are auto-joined in the action; insert only for additional)
insert into public.project_members (project_id, user_id, member_type, status, role_title) values
  ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000010','CORE_MEMBER','ACTIVE','Perception Lead'),
  ('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000022','CORE_MEMBER','ACTIVE','Backend'),
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','COLLABORATOR','ACTIVE','Medical Collaborator')
on conflict do nothing;

-- Open roles
insert into public.project_roles (project_id, title, description, commitment_min, commitment_max, experience_level, required_skills, status) values
  ('10000000-0000-0000-0000-000000000001','Radiology Collaborator','Validate segmentation methodology and advise on clinical handoff.',3,8,'MID',array['Radiology','Medical Imaging'],'OPEN'),
  ('10000000-0000-0000-0000-000000000001','Frontend Engineer','Build a clean clinician-facing demo UI.',5,12,'ANY',array['React','TypeScript','Product Design'],'OPEN'),
  ('10000000-0000-0000-0000-000000000002','Mechanical Designer','Design a custom mount for the ZED 2 camera on a turret.',4,10,'ANY',array['CAD','Mechanical Design'],'OPEN'),
  ('10000000-0000-0000-0000-000000000003','SLAM Engineer','Improve loop closure for long corridors.',8,15,'SENIOR',array['ROS','C++','Robotics'],'OPEN'),
  ('10000000-0000-0000-0000-000000000004','Firmware Engineer','STM32 + BLDC control loop.',4,10,'MID',array['Embedded Systems','C'],'OPEN'),
  ('10000000-0000-0000-0000-000000000005','Bioinformatics Collaborator','Help curate training data and validate structure predictions.',4,8,'ANY',array['Bioinformatics','Genomics'],'OPEN'),
  ('10000000-0000-0000-0000-000000000006','Designer','Design system + onboarding for the notebook editor.',3,8,'ANY',array['Figma','Product Design'],'OPEN'),
  ('10000000-0000-0000-0000-000000000007','ML Engineer','Train the recommendations model on synthetic SMB data.',6,12,'MID',array['Machine Learning','Python'],'OPEN'),
  ('10000000-0000-0000-0000-000000000008','Rust Engineer','Implement the streaming risk core.',8,15,'SENIOR',array['Rust','Flink'],'OPEN'),
  ('10000000-0000-0000-0000-000000000009','3D Artist','Low-poly environment assets.',3,8,'ANY',array['Unity','3D Modeling'],'OPEN'),
  ('10000000-0000-0000-0000-000000000010','NLP Researcher','Continued pretraining experiments.',5,10,'SENIOR',array['NLP','PyTorch'],'OPEN'),
  ('10000000-0000-0000-0000-000000000011','Security Analyst','CVE triage and scoring heuristics.',3,8,'ANY',array['Security'],'OPEN'),
  ('10000000-0000-0000-0000-000000000012','Embedded Developer','STM32 firmware + UI.',4,10,'MID',array['Embedded Systems','C'],'OPEN'),
  ('10000000-0000-0000-0000-000000000013','Data Engineer','dbt models + tests.',5,12,'MID',array['Data Engineering','PostgreSQL'],'OPEN'),
  ('10000000-0000-0000-0000-000000000014','Curriculum Designer','Reading curriculum for grade 3-5.',3,8,'ANY',array['Education','Pedagogy'],'OPEN')
on conflict do nothing;

-- Applications
insert into public.applications (project_id, role_id, applicant_id, why_interested, contribution, hours_per_week, status) values
  ('10000000-0000-0000-0000-000000000001',null,'00000000-0000-0000-0000-000000000002','CT segmentation aligns with my research on lung nodule classification.','I can validate the evaluation methodology and help with clinical handoff docs.',5,'PENDING'),
  ('10000000-0000-0000-0000-000000000001',null,'00000000-0000-0000-0000-000000000009','I want to ship a real product with ML folks.','I can build the clinician-facing UI in React.',6,'PENDING'),
  ('10000000-0000-0000-0000-000000000002',null,'00000000-0000-0000-0000-000000000017','Mechanical design is what I do.','I can design a rugged mount + cable management for warehouse conditions.',5,'PENDING'),
  ('10000000-0000-0000-0000-000000000006',null,'00000000-0000-0000-0000-000000000007','Local-first is a cause I care about.','I can design the onboarding + 3 empty states.',4,'PENDING')
on conflict do nothing;

-- Matches (representative)
insert into public.matches (project_id, role_id, initiator_user_id, candidate_user_id, status) values
  ('10000000-0000-0000-0000-000000000001',null,'00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','MUTUAL'),
  ('10000000-0000-0000-0000-000000000001',null,'00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','APPLIED'),
  ('10000000-0000-0000-0000-000000000002',null,'00000000-0000-0000-0000-000000000017','00000000-0000-0000-0000-000000000003','INVITED'),
  ('10000000-0000-0000-0000-000000000003',null,'00000000-0000-0000-0000-000000000028','00000000-0000-0000-0000-000000000010','MUTUAL'),
  ('10000000-0000-0000-0000-000000000006',null,'00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000006','MUTUAL'),
  ('10000000-0000-0000-0000-000000000004',null,'00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000004','INVITED'),
  ('10000000-0000-0000-0000-000000000005',null,'00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000023','APPLIED'),
  ('10000000-0000-0000-0000-000000000011',null,'00000000-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000015','MUTUAL'),
  ('10000000-0000-0000-0000-000000000012',null,'00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000017','INVITED'),
  ('10000000-0000-0000-0000-000000000013',null,'00000000-0000-0000-0000-000000000018','00000000-0000-0000-0000-000000000018','MUTUAL')
on conflict do nothing;

-- Trials (4 representative)
insert into public.trials (id, project_id, owner_id, status, goal, deliverables, duration_days, starts_at, ends_at) values
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','ACTIVE','Validate segmentation evaluation methodology and produce a clinician-ready results table.',array['Evaluation doc','Results table','Sign-off from medical collaborator'],7, now() - interval '2 day', now() + interval '5 day'),
  ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000010','ACTIVE','Improve loop closure for long corridors and ship a benchmark.',array['Loop-closure PR','Benchmark notebook','Demo video'],14, now() - interval '5 day', now() + interval '9 day'),
  ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000006','COMPLETED','Onboarding flow design + 3 empty states.',array['3 empty states','Onboarding copy','A/B variant'],7, now() - interval '14 day', now() - interval '7 day'),
  ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000018','SUCCESSFUL','First 5 dbt models with tests.',array['5 dbt models','5 tests','README runbook'],7, now() - interval '30 day', now() - interval '23 day')
on conflict do nothing;

insert into public.trial_members (trial_id, user_id, role) values
  ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','OWNER'),
  ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','COLLABORATOR'),
  ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000010','OWNER'),
  ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000028','COLLABORATOR'),
  ('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000006','OWNER'),
  ('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000007','COLLABORATOR'),
  ('20000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000018','OWNER'),
  ('20000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000012','COLLABORATOR')
on conflict do nothing;

-- 5 clans
insert into public.clans (id, slug, name, description, type, institution, country_code, visibility, owner_id, xp) values
  ('30000000-0000-0000-0000-000000000001','itu-ai','ITU AI','AI community at Istanbul Technical University.','UNIVERSITY','ITU','TR','PUBLIC','00000000-0000-0000-0000-000000000001',18420),
  ('30000000-0000-0000-0000-000000000002','ytu-robotics','YTU Robotics','Robotics club at Yıldız Technical University.','UNIVERSITY','YTU','TR','PUBLIC','00000000-0000-0000-0000-000000000020',17910),
  ('30000000-0000-0000-0000-000000000003','cancer-ai','Cancer AI Researchers','Interdisciplinary researchers building AI for oncology.','RESEARCH',null,null,'PUBLIC','00000000-0000-0000-0000-000000000027',16330),
  ('30000000-0000-0000-0000-000000000004','open-source-robotics','Open Source Robotics','Robotics engineers contributing to open projects.','COMMUNITY',null,null,'PUBLIC','00000000-0000-0000-0000-000000000010',15740),
  ('30000000-0000-0000-0000-000000000005','indie-builders-istanbul','Indie Builders Istanbul','Indie hackers, designers, and tinkerers in Istanbul.','COMMUNITY',null,'TR','PUBLIC','00000000-0000-0000-0000-000000000006',8210)
on conflict do nothing;

-- Notifications (samples)
insert into public.notifications (user_id, type, title, body, link) values
  ('00000000-0000-0000-0000-000000000001','NEW_APPLICATION','Elif Kaya applied to Lung CT AI','Medical collaborator candidate.','/projects/lung-ct-ai'),
  ('00000000-0000-0000-0000-000000000002','MATCH_ACCEPTED','Your application was accepted','You can start a 7-day Trial Sprint.','/matches'),
  ('00000000-0000-0000-0000-000000000010','NEW_APPLICATION','Haruto Sato applied to Drone SLAM','SLAM engineer.','/projects/drone-slam')
on conflict do nothing;
