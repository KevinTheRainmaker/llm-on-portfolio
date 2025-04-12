export const profile = {
	fullName: 'Kangbeen Ko',
	title: 'M.S. Student at HCIS Lab,',
	institute: 'Gwangju Institute of Science and Technology',
	author_name: 'Ko, K.', // Author name to be highlighted in the papers section
	research_areas: [
		{ title: 'Human-Agent Interaction', description: 'Developing intelligent agents that adapt to user context and provide personalized assistance', field: 'human-agent-interaction' },
		{ title: 'Context-aware AI', description: 'Creating AI systems that understand and respond to environmental and user contexts', field: 'context-aware-ai' },
		{ title: 'LLM-integrated Systems', description: 'Integrating large language models into everyday applications for enhanced human capabilities', field: 'llm-integrated' },
	],
}

// Set equal to an empty string to hide the icon that you don't want to display
export const social = {
	email: 'eyeoftyphoon@gm.gist.ac.kr',
	linkedin: 'https://www.linkedin.com/in/kevin-the-rainmaker',
	x: '', // 빈 문자열로 설정하여 X(Twitter) 아이콘 숨김
	github: 'https://github.com/KevinTheRainmaker',
	gitlab: '',
	scholar: 'https://scholar.google.com/citations?user=0wA0FGgAAAAJ&hl=ko',
	inspire: '',
	arxiv: '',
	instagram: 'https://www.instagram.com/lucete_lactea/' // Instagram 추가
}

export const template = {
	website_url: 'https://localhost:4321', // Astro needs to know your site's deployed URL to generate a sitemap. It must start with http:// or https://
	menu_left: false,
	transitions: true,
	lightTheme: 'light', // Select one of the Daisy UI Themes or create your own
	darkTheme: 'dark', // Select one of the Daisy UI Themes or create your own
	excerptLength: 200,
	postPerPage: 5,
    base: '' // Repository name starting with /
}

export const seo = {
	default_title: "Welcome to Kevin's Personal Website",
	default_description: 'This is a personal website for Kangbeen Ko, a student at Gwangju Institute of Science and Technology.',
	default_image: '/images/astro-academia.png',
}
