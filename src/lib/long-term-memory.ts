/**
 * Long-term Memory Module
 * Manages static profile information loaded from JSON
 */

import profileData from '@/data/profile-data.json';

export interface SiteLink {
  label: string;
  href: string;
}

export class LongTermMemory {
  private data: typeof profileData;

  constructor() {
    this.data = profileData;
  }

  /**
   * Get all profile data
   */
  getAll() {
    return this.data;
  }

  /**
   * Get education information
   */
  getEducation() {
    return this.data.education || [];
  }

  /**
   * Get skills information
   */
  getSkills() {
    return this.data.skills || [];
  }

  /**
   * Get publications
   */
  getPublications() {
    return this.data.publications || [];
  }

  /**
   * Get work experiences
   */
  getExperiences() {
    return this.data.experiences || [];
  }

  /**
   * Get projects
   */
  getProjects() {
    return this.data.projects || [];
  }

  /**
   * Get awards
   */
  getAwards() {
    return this.data.awards || [];
  }

  /**
   * Get other experiences
   */
  getOtherExperiences() {
    return this.data.otherExperiences || [];
  }

  /**
   * Get formatted context string for LLM
   */
  getContextForLLM(): string {
    const sections: string[] = [];

    // Education
    if (this.data.education) {
      sections.push('## Education');
      this.data.education.forEach((edu) => {
        sections.push(`- ${edu.degree || ''} at ${edu.school || ''} (${edu.time || ''})`);
        if (edu.description) {
          sections.push(`  ${edu.description}`);
        }
      });
    }

    // Skills
    if (this.data.skills) {
      sections.push('\n## Skills');
      this.data.skills.forEach((skill) => {
        sections.push(`- ${skill.title || ''}: ${skill.description || ''}`);
      });
    }

    // Publications
    if (this.data.publications) {
      sections.push('\n## Publications');
      this.data.publications.forEach((pub) => {
        sections.push(`- ${pub.title || ''} (${pub.time || ''})`);
        sections.push(`  Authors: ${pub.authors || ''}`);
        sections.push(`  Journal: ${pub.journal || ''}`);
        if (pub.abstract) {
          sections.push(`  Abstract: ${pub.abstract.substring(0, 200)}...`);
        }
      });
    }

    // Experiences
    if (this.data.experiences) {
      sections.push('\n## Work Experiences');
      this.data.experiences.forEach((exp) => {
        sections.push(`- ${exp.title || ''} at ${exp.company || ''} (${exp.time || ''})`);
        if (exp.description) {
          sections.push(`  ${exp.description.substring(0, 200)}...`);
        }
      });
    }

    // Projects
    if (this.data.projects) {
      sections.push('\n## Projects');
      this.data.projects.forEach((proj) => {
        sections.push(`- ${proj.title || ''} (${proj.time || ''})`);
        if (proj.description) {
          sections.push(`  ${proj.description.substring(0, 200)}...`);
        }
      });
    }

    // Awards
    if (this.data.awards) {
      sections.push('\n## Awards & Honors');
      this.data.awards.forEach((award) => {
        sections.push(`- ${award.title || ''} (${award.time || ''})`);
      });
    }

    return sections.join('\n');
  }

  /**
   * Get all available site links
   */
  getSiteLinks(): SiteLink[] {
    const links: SiteLink[] = [];

    // Add main pages
    links.push(
      { label: 'Home', href: '/' },
      { label: 'Papers', href: '/papers' },
      { label: 'Research', href: '/research' },
      { label: 'CV', href: '/cv' }
    );

    // Add CV sections
    links.push(
      { label: 'Education', href: '/cv#education' },
      { label: 'Experiences', href: '/cv#experiences' },
      { label: 'Projects', href: '/cv#projects' },
      { label: 'Awards', href: '/cv#awards' },
      { label: 'Skills', href: '/cv#skills' }
    );

    // Add publication links
    this.data.publications?.forEach((pub) => {
      if (pub.title && pub.link) {
        links.push({
          label: pub.title,
          href: pub.link,
        });
      }
    });

    // Add project links
    this.data.projects?.forEach((proj) => {
      if (proj.title && proj.link) {
        links.push({
          label: proj.title,
          href: proj.link,
        });
      }
    });

    return links;
  }
}

// Global instance
let longTermMemory: LongTermMemory | null = null;

export function getLongTermMemory(): LongTermMemory {
  if (!longTermMemory) {
    longTermMemory = new LongTermMemory();
  }
  return longTermMemory;
}
