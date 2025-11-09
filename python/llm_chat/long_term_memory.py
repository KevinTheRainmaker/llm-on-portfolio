"""
Long-term Memory Module
Manages static profile information (education, publications, projects, etc.)
"""

import json
import os
from typing import Dict, Any, List
from pathlib import Path


class LongTermMemory:
    """
    Long-term memory stores all static profile information
    This data is loaded once and remains constant throughout the session
    """

    def __init__(self, data_path: str = None):
        """
        Initialize long-term memory

        Args:
            data_path: Path to profile data JSON file
        """
        if data_path is None:
            # Default path relative to this file
            current_dir = Path(__file__).parent
            data_path = current_dir.parent / "data" / "profile_data.json"

        self.data_path = data_path
        self.data: Dict[str, Any] = {}
        self._load_data()

    def _load_data(self):
        """Load profile data from JSON file"""
        try:
            with open(self.data_path, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            print(f"Long-term memory loaded: {len(self.data)} categories")
        except FileNotFoundError:
            print(f"Warning: Profile data file not found at {self.data_path}")
            self.data = {}
        except json.JSONDecodeError as e:
            print(f"Error parsing profile data JSON: {e}")
            self.data = {}

    def get_all(self) -> Dict[str, Any]:
        """Get all profile data"""
        return self.data

    def get_education(self) -> List[Dict[str, Any]]:
        """Get education information"""
        return self.data.get('education', [])

    def get_skills(self) -> List[Dict[str, Any]]:
        """Get skills information"""
        return self.data.get('skills', [])

    def get_publications(self) -> List[Dict[str, Any]]:
        """Get publications"""
        return self.data.get('publications', [])

    def get_experiences(self) -> List[Dict[str, Any]]:
        """Get work experiences"""
        return self.data.get('experiences', [])

    def get_projects(self) -> List[Dict[str, Any]]:
        """Get projects"""
        return self.data.get('projects', [])

    def get_awards(self) -> List[Dict[str, Any]]:
        """Get awards"""
        return self.data.get('awards', [])

    def get_other_experiences(self) -> List[Dict[str, Any]]:
        """Get other experiences"""
        return self.data.get('otherExperiences', [])

    def search(self, query: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Search profile data for relevant information

        Args:
            query: Search query string

        Returns:
            Dictionary with matching items from each category
        """
        query_lower = query.lower()
        results = {}

        # Search in each category
        for category, items in self.data.items():
            if not isinstance(items, list):
                continue

            matching_items = []
            for item in items:
                # Convert item to string for searching
                item_str = json.dumps(item, ensure_ascii=False).lower()
                if query_lower in item_str:
                    matching_items.append(item)

            if matching_items:
                results[category] = matching_items

        return results

    def get_context_for_llm(self) -> str:
        """
        Get formatted context string for LLM

        Returns:
            Formatted string containing all profile information
        """
        sections = []

        # Education
        if self.data.get('education'):
            sections.append("## Education")
            for edu in self.data['education']:
                sections.append(f"- {edu.get('degree', '')} at {edu.get('school', '')} ({edu.get('time', '')})")
                if edu.get('description'):
                    sections.append(f"  {edu['description']}")

        # Skills
        if self.data.get('skills'):
            sections.append("\n## Skills")
            for skill in self.data['skills']:
                sections.append(f"- {skill.get('title', '')}: {skill.get('description', '')}")

        # Publications
        if self.data.get('publications'):
            sections.append("\n## Publications")
            for pub in self.data['publications']:
                sections.append(f"- {pub.get('title', '')} ({pub.get('time', '')})")
                sections.append(f"  Authors: {pub.get('authors', '')}")
                sections.append(f"  Journal: {pub.get('journal', '')}")
                if pub.get('abstract'):
                    sections.append(f"  Abstract: {pub['abstract'][:200]}...")

        # Experiences
        if self.data.get('experiences'):
            sections.append("\n## Work Experiences")
            for exp in self.data['experiences']:
                sections.append(f"- {exp.get('title', '')} at {exp.get('company', '')} ({exp.get('time', '')})")
                if exp.get('description'):
                    sections.append(f"  {exp['description'][:200]}...")

        # Projects
        if self.data.get('projects'):
            sections.append("\n## Projects")
            for proj in self.data['projects']:
                sections.append(f"- {proj.get('title', '')} ({proj.get('time', '')})")
                if proj.get('description'):
                    sections.append(f"  {proj['description'][:200]}...")

        # Awards
        if self.data.get('awards'):
            sections.append("\n## Awards & Honors")
            for award in self.data['awards']:
                sections.append(f"- {award.get('title', '')} ({award.get('time', '')})")

        return "\n".join(sections)

    def get_site_links(self) -> List[Dict[str, str]]:
        """
        Get all available site links from profile data

        Returns:
            List of dictionaries with 'label' and 'href' keys
        """
        links = []

        # Add main pages
        links.extend([
            {"label": "Home", "href": "/"},
            {"label": "Papers", "href": "/papers"},
            {"label": "Research", "href": "/research"},
            {"label": "CV", "href": "/cv"},
        ])

        # Add CV sections
        links.extend([
            {"label": "Education", "href": "/cv#education"},
            {"label": "Experiences", "href": "/cv#experiences"},
            {"label": "Projects", "href": "/cv#projects"},
            {"label": "Awards", "href": "/cv#awards"},
            {"label": "Skills", "href": "/cv#skills"},
        ])

        # Add publication links
        for pub in self.data.get('publications', []):
            if pub.get('title') and pub.get('link'):
                links.append({
                    "label": pub['title'],
                    "href": pub['link']
                })

        # Add project links
        for proj in self.data.get('projects', []):
            if proj.get('title') and proj.get('link'):
                links.append({
                    "label": proj['title'],
                    "href": proj['link']
                })

        return links


# Global instance
_long_term_memory = None


def get_long_term_memory() -> LongTermMemory:
    """Get or create global long-term memory instance"""
    global _long_term_memory
    if _long_term_memory is None:
        _long_term_memory = LongTermMemory()
    return _long_term_memory
