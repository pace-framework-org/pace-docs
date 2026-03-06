import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'PACE Framework',
      description: 'AI-driven sprint execution for software teams. Plan · Architect · Code · Evaluate.',
      logo: {
        src: './src/assets/pace-logo.svg',
        replacesTitle: false,
      },
      social: {
        github: 'https://github.com/pace-framework-org/pace-framework-starter',
      },
      editLink: {
        baseUrl: 'https://github.com/pace-framework-org/pace-docs/edit/main/',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', link: '/' },
            { label: 'Quickstart', link: '/tutorials/quickstart/' },
            { label: 'Your First Sprint', link: '/tutorials/first-sprint/' },
            { label: 'Add PACE to an Existing Project', link: '/tutorials/existing-project/' },
          ],
        },
        {
          label: 'How-To Guides',
          items: [
            { label: 'Configure Your Project', link: '/guides/configure-your-project/' },
            { label: 'Switch LLM Provider', link: '/guides/switch-llm-provider/' },
            { label: 'Switch Platform', link: '/guides/switch-platform/' },
            { label: 'Write a Sprint Plan', link: '/guides/write-a-sprint-plan/' },
            { label: 'Set Human Gate Days', link: '/guides/set-human-gate-days/' },
            { label: 'Push Advisory Findings to Issues', link: '/guides/push-advisory-to-issues/' },
            { label: 'Connect PACE to Jira', link: '/guides/jira-adapter/' },
            { label: 'Add a New Platform', link: '/guides/add-a-new-platform/' },
            { label: 'Add a New LLM Provider', link: '/guides/add-a-new-llm/' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'The PACE Pipeline', link: '/concepts/pipeline/' },
            { label: 'Advisory Backlog', link: '/concepts/advisory-backlog/' },
            { label: 'SCRIBE & Context Documents', link: '/concepts/scribe-and-context/' },
            { label: 'Platform Adapters', link: '/concepts/platform-adapters/' },
            { label: 'LLM Adapters', link: '/concepts/llm-adapters/' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'pace.config.yaml', link: '/reference/pace-config-yaml/' },
            { label: 'plan.yaml Fields', link: '/reference/plan-yaml/' },
            { label: 'Agent Output Schemas', link: '/reference/agent-outputs/' },
            { label: 'Environment Variables', link: '/reference/env-vars/' },
            { label: 'CLI Commands', link: '/reference/cli/' },
          ],
        },
      ],
    }),
  ],
  site: 'https://pace-framework.org',
});
