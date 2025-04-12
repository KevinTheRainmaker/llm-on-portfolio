export const education = [
	{
	  school: 'Human-Centered Intelligent System Lab',
	  schoolLink: 'https://sites.google.com/view/gist-hcis-lab',
	  time: 'Mar. 2025 – Present',
	  degree: 'Master of Engineering Degree',
	  location: 'GIST, Gwangju, Korea',
	  description: '**Advisor: Prof. SeungJun Kim**',
	},
	{
	  school: 'Major in EECS / Minor in AI',
	  schoolLink: 'https://www.gist.ac.kr/',
	  time: 'Mar. 2019 – Aug. 2024',
	  degree: 'Bachelor of Engineering Degree',
	  location: 'GIST, Gwangju, Korea',
	},
	{
		school: 'Autonomous Computing System Lab ',
		schoolLink: 'https://uehwan.github.io/',
		time: 'Sep. 2022 – Feb. 2023',
		degree: 'Undergraduate Research Intern',
		location: 'GIST, Gwangju, Korea',	
	},
	{
		school: 'Biomedical Informatics & Intelligence Lab ',
		schoolLink: 'https://www.biil-gist.net/',
		time: 'Sep. 2020 – Aug. 2021',
		location: 'GIST, Gwangju, Korea',
	},
  ];
  
  export const skills = [
	{
	  title: 'Programming Languages',
	  description: 'Python, C, C++, C#, SQL, Cypher',
	},
	{
		title: 'Frameworks',
		description: 'PyTorch, TensorFlow, Keras, Flask, FastAPI, Flutter',
	},
	{
		title: 'Tools',
		description: 'Git, Docker, AWS, W&B, Hugging Face, LangChain, Langfuse, LangGraph',
	},
	{
		title: 'Languages',
		description: 'English (Fluent), Korean (Native)',
	},
  ];
  
  export const publications = [
	{
	  title: 'LEGOLAS: Learning & Enhancing Golf Skills through LLM-Augmented System',
	  authors: 'Ko, K., Oh, M., Seong, M., & Kim, S. J.',
	  journal: 'Extended Abstracts of the CHI Conference on Human Factors in Computing Systems',
	  time: 'May 2025',
	  link: 'https://programs.sigchi.org/chi/2025/program/content/194268',
	  thumbnail: '/images/publications/LEGOLAS_video_figure.gif', // thumbnail 경로
	  highlight: true,
	},
	{
	  title: 'Leveraging voice for early detection of chronic kidney disease: Enabling continuous monitoring in remote healthcare',
	  authors: 'Ko, K., Ryu, J., & Kim, S.',
	  journal: 'Proceedings of eTELEMED 2024',
	  time: 'May 2024',
	  link: 'https://www.thinkmind.org/library/eTELEMED/eTELEMED_2024/etelemed_2024_1_90_40029.html',
	  highlight: false,
	},
	{
	  title: 'A Survey on 3D Scene Graphs: Definition, Generation and Application',
	  authors: 'Bae, J*., Shin, D*., Ko, K., Lee, J., & Kim, U. H.',
	  journal: 'International Conference on Robot Intelligence Technology and Applications',
	  time: 'December 2022',
	  link: 'https://link.springer.com/chapter/10.1007/978-3-031-26889-2_13',
	  highlight: false,
	},
  ];
  
  
  export const experiences = [
	{
		company: 'GDGoC GIST',
		companyLink: 'https://gdg.community.dev/gdg-on-campus-gwangju-institute-of-science-and-technology-gwangju-south-korea/',
		time: 'Sep. 2021 – Present',
		title: 'Core Member & AI Mentor',
		location: 'GIST, Gwangju, Korea',
		description: `**Google Developer Group on Campus**\n
					  **Led AI/ML track as Core R&D member (2021–2022)**\n
					  - Organized and taught sessions on **Git, ML, and Kaggle studies**\n
					  - Planned and hosted seminars, **GDSC x GDG 'AI in Wonderland'**\n\n
					  **Mentored student AI projects (2022–Present)**\n
					  - Delivered sessions on **AI config management with Hydra/Gin**\n
					  - Currently running **'Decoding The Deep'** AI seminar (GenAI, RecSys, XAI, LLM fine-tuning)\n
					  - Provide ongoing student projects mentorship
					  `,
	},
	{
		company: 'SNUBH Medical AI Center',
		companyLink: 'https://bri.snubh.org/aic/',
		time: 'Jun. 2023 – July. 2024',
		title: 'Research Intern',
		location: 'Seoul, Korea',
		description: `**Initial MVP development team for SickGPT, a chatbot for medical record understanding**\n
						- Developed an automated fine-tuning dataset pipeline for a role-playing-based medical LLM service, SickGPT\n
						- Built scenario generation agents for dialogue creation and fine-tuned LLaMA2-7B\n
						- Designed evaluation pipeline measuring question relevance, BLEU score, and answer grounding\n
					  **Authored a research paper on machine learning–based severity prediction for Chronic Kidney Disease**\n
						- Built a voice-based CKD severity prediction model\n
						- Proposed clinically grounded features and validated statistical significance\n
						- Published a research paper in eTELEMED 2024 (Advisor: Prof. Sejoong Kim)
						`,
	},
	{
	  company: 'GroupByHR Inc.',
	  companyLink: 'https://groupby.kr/',
	  time: 'Jul. 2021 – Aug. 2022',
	  title: 'Co-founder & AI Researcher',
	  location: 'Seoul, Korea',
	  description: `**Data-driven Hiring platform for Early-stage Startups**\n
					- **Co-founded** startup from 2021\n
					- Raised **Seed-round funding** from two Venture Capitalists\n		
					- Built **Personalized and Real-time Position Recommendation Algorithms** using GNNs\n
					- Led **2022 Tech Incubator Program for Startup (TIPS)**
					`,
	},
  ];
  
// 프로젝트 데이터 구조 추가
export const projects = [
  {
    title: "Soridam: Keeping Family Voices and Emotions Alive, Wherever You Are",
    description: `Developed a family-oriented social networking app enabling communication through photos and voice messages across different regions and time zones. 
					Integrated voice-based emotion recognition to preview messages with emotional emojis, and included a feature for revisiting memories by listening 
					to archived voices of late family members.`,
    thumbnail: "/src/assets/projects/soridam.png",
    link: "https://www.youtube.com/watch?v=LrO6cmoMTF4",
    time: "2022",
    tags: ["Affective Computing", "Emotion Recognition"]
  },
  {
    title: "Be With You: A Soft Hug for Every Silent Struggle",
    description: `Developed a self-guided mental wellness platform powered by an LLM-based chatbot that provides psychological wellness framework 
					to help users structure negative thoughts and ease emotional distress. With each response, comforting capybara characters gather around the user, 
					culminating in a personalized message of encouragement generated by the LLM.`,
    thumbnail: "/src/assets/projects/be_with_you.png",
    link: "https://youtu.be/BK_KMwFTS7g",
    time: "2024",
    tags: ["Emotional Reflection", "Affective Design", "Self-healing", "LLM"]
  },
  {
    title: "Peach Seoga: Text Simplification Platform for Slow Learners",
    description: `Collaborated with the non-profit Peach Market to develop an LLM-powered service that generates easy-to-read draft texts for learners with cognitive or developmental challenges. 
					By uploading original content and selecting a desired format, users receive drafts based on prompts 
					co-designed with experts — reducing the adaptation process from over a day to under one minute.`,
    thumbnail: "/src/assets/projects/peach_seoga.png",
    link: "https://ai.peachseoga.com/",
    time: "2024-2025",
    tags: ["Accessibility", "AI for education", "LLM"]
  }
];

// 수상 경력 데이터 추가
export const awards = [
	{
	  title: "GIST Creative Convergence Competition 2nd Prize",
	  organization: "Gwangju Institute of Science and Technology",
	  time: "2020",
	  description: "Developed an AI model for forecasting solar power generation and optimizing energy scheduling on campus"
	},
	{
		title: "Oasis Hackathon Special Awards",
		organization: "Honam ICT Innovation Square",
		time: "2021",
		description: "A job aggregator that lets users search across all platforms and receive email for saved interests."
	},
	{
		title: "GIST Demo Day 2nd Prize",
		organization: "Gwangju Institute of Science and Technology",
		time: "2023",
		description: "Developed a service enabling children to converse with their own drawn characters, featuring customizable TTS models built from parental voice recordings."
	},
	{
		title: "GDSC GIST Hackathon 2nd Prize",			
		organization: "Gwangju Institute of Science and Technology",
		time: "2023",
		description: "Developed a self-guided mental wellness platform powered by an LLM-based chatbot that provides psychological wellness framework to help users structure negative thoughts and ease emotional distress."
	},
	{
		title: "K-ium Medical AI Competition Excellence Award",
		organization: "Pusan National University Hospital",
		time: "2023",
		description: "Built a deep learning model for cerebral aneurysm localization using cerebral angiography imaging data."
	},
	{
		title: "UN AI4Good Hackathon Chairman’s Award, Innopolis Foundation",
		organization: "Ministry of Science and ICT, Korea",
		time: "2024",
		description: "Developed a multimodal LLM-based online shopping assistant for visually impaired users, capable of extracting on-screen information and providing voice-based responses to user queries."
	},
  ];
  
  // 기타 경험 데이터 추가
// 기타 경험 데이터 추가
export const otherExperiences = [
	{
	  title: "Startup Program Finalist & Participant",
	  organization: "Innopolis Foundation, KAIST E*5, X-IST, Ministry of Education",
	  time: "2021",
	  description: "Selected for various early-stage startup competitions and accelerators, including the Pre-Startup Package (AI Track, Best Company Award), Youth Startup 300 (Finalist), Innopolis Campus (Final Selection), X-IST, and KAIST E*5 (Round 2)."
	},
	{
	  title: "Technical Book Reviewer & Beta Reader",
	  organization: "Hanbit Media, BJ Public",
	  time: "2022 – 2024",
	  description: "Reviewed and contributed feedback for domestic and international IT publications. Authored endorsements and beta reviews for titles such as 'Reversed Python by Examples' and 'Reliable Data Engineering'; served as a preview reader for overseas titles in 2023."
	},
	{
	  title: "Community Member – Developer Self-Growth Groups",
	  organization: "Eigenvector, Geultto",
	  time: "2022 – 2023",
	  description: "Participated in developer self-growth communities focused on writing and technical development, including Eigenvector (3rd, 4th cohort) and Geultto (9th, 10th cohort)."
	},
	{
	  title: "English Language Proficiency",
	  organization: "ETS / Seoul National University",
	  time: "Latest: 2023",
	  description: "TOEIC score: 935 / TEPS score: 426 — certified English proficiency for professional and academic use."
	},
	{
	  title: "AI Talent Program Applicant",
	  organization: "SGM AI",
	  time: "2022",
	  description: "Successfully passed the document screening stage of the SGM AI 2nd cohort, a selective AI training program for aspiring researchers and engineers."
	},
	{
	  title: "Challenge Program Leader & Member",
	  organization: "GIST Infinite Challenge",
	  time: "2019 – 2023",
	  description: "Selected four times for the GIST Infinite Challenge program. Served as team member (5th cohort) and team leader (4th, 6th, and 8th cohorts), leading student innovation projects over multiple years."
	},
  ];
  
  