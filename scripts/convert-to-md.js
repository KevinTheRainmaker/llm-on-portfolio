#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

/**
 * 데이터를 마크다운으로 변환하는 스크립트
 * 
 * 사용법:
 * npm run convert-to-md
 * 또는
 * node scripts/convert-to-md.js
 */

// ES 모듈 환경에서 __dirname 구현
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// 출력 디렉토리 생성
const outputDir = path.join(__dirname, '../content/cv');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// TS 파일을 JS로 변환하는 함수
function convertTsToJs(tsFilePath) {
  const tempJsPath = path.join(__dirname, 'temp.js');
  
  // TypeScript 파일을 JavaScript로 변환
  try {
    const tsCode = fs.readFileSync(tsFilePath, 'utf-8');
    
    // 타입 정의와 export 키워드 제거
    let jsCode = tsCode
      .replace(/export\s+/g, '') // export 키워드 제거
      .replace(/import.*?from.*?;/g, '') // import 문 제거
      .replace(/interface\s+\w+\s*\{[\s\S]*?\}/g, '') // interface 제거
      .replace(/:\s*\w+(\[\])?\s*=/g, ' =') // 타입 정의 제거 (예: title: string = 'foo' -> title = 'foo')
      .replace(/type\s+\w+\s*=[\s\S]*?;/g, ''); // type 정의 제거
    
    // ESM 형식으로 모듈 내보내기 추가
    jsCode = 
    `${jsCode}
    
    export { 
      education, 
      skills, 
      publications, 
      experiences, 
      projects, 
      awards, 
      otherExperiences 
    };`;
    
    // 임시 JS 파일 생성
    fs.writeFileSync(tempJsPath, jsCode, 'utf-8');
    
    // 임시 JS 파일 동적 임포트
    return import(`file://${tempJsPath}`).then(data => {
      // 임시 파일 삭제
      fs.unlinkSync(tempJsPath);
      return data;
    }).catch(error => {
      console.error('JS 파일 임포트 중 오류 발생:', error);
      // 임시 파일이 있다면 삭제
      if (fs.existsSync(tempJsPath)) {
        fs.unlinkSync(tempJsPath);
      }
      throw error;
    });
  } catch (error) {
    console.error('TS 파일 변환 중 오류 발생:', error);
    // 임시 파일이 있다면 삭제
    if (fs.existsSync(tempJsPath)) {
      fs.unlinkSync(tempJsPath);
    }
    throw error;
  }
}

// 객체 배열을 마크다운으로 변환
function convertArrayToMarkdown(array, frontmatter = {}, formatFn = null) {
  let markdown = '---\n';
  
  // Front Matter 추가
  Object.entries(frontmatter).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      markdown += `${key}:\n`;
      value.forEach(item => markdown += `  - ${item}\n`);
    } else {
      markdown += `${key}: "${value}"\n`;
    }
  });
  
  markdown += '---\n\n';
  
  // 각 항목을 마크다운으로 변환
  array.forEach((item, index) => {
    if (formatFn) {
      // 커스텀 포맷 함수가 제공된 경우 사용
      markdown += formatFn(item, index);
    } else {
      // 기본 포맷: 제목 + 설명
      markdown += `## ${item.title || 'Item ' + (index + 1)}\n\n`;
      
      Object.entries(item).forEach(([key, value]) => {
        if (key === 'title') return; // 제목은 이미 사용했으므로 스킵
        
        if (typeof value === 'string') {
          markdown += `**${key.charAt(0).toUpperCase() + key.slice(1)}**: ${value}\n\n`;
        } else if (Array.isArray(value)) {
          markdown += `**${key.charAt(0).toUpperCase() + key.slice(1)}**: ${value.join(', ')}\n\n`;
        }
      });
    }
    
    // 항목 사이에 구분선 추가
    if (index < array.length - 1) {
      markdown += '---\n\n';
    }
  });
  
  return markdown;
}

// 교육 내역을 마크다운으로 변환
function formatEducation(education, index) {
  let md = `## ${education.degree || 'Education ' + (index + 1)}\n\n`;
  
  if (education.school) {
    md += `**Institution**: `;
    if (education.schoolLink) {
      md += `[${education.school}](${education.schoolLink})`;
    } else {
      md += education.school;
    }
    md += '\n\n';
  }
  
  if (education.time) {
    md += `**Period**: ${education.time}\n\n`;
  }
  
  if (education.location) {
    md += `**Location**: ${education.location}\n\n`;
  }
  
  if (education.description) {
    md += `${education.description}\n\n`;
  }
  
  return md;
}

// 경력 내역을 마크다운으로 변환
function formatExperience(experience, index) {
  let md = `## ${experience.title || 'Experience ' + (index + 1)}\n\n`;
  
  if (experience.company) {
    md += `**Company**: `;
    if (experience.companyLink) {
      md += `[${experience.company}](${experience.companyLink})`;
    } else {
      md += experience.company;
    }
    md += '\n\n';
  }
  
  if (experience.time) {
    md += `**Period**: ${experience.time}\n\n`;
  }
  
  if (experience.location) {
    md += `**Location**: ${experience.location}\n\n`;
  }
  
  if (experience.description) {
    md += `${experience.description}\n\n`;
  }
  
  return md;
}

// 프로젝트를 마크다운으로 변환
function formatProject(project, index) {
  let md = `## ${project.title || 'Project ' + (index + 1)}\n\n`;
  
  if (project.time) {
    md += `**Period**: ${project.time}\n\n`;
  }
  
  if (project.link) {
    md += `**Link**: [View Project](${project.link})\n\n`;
  }
  
  if (project.description) {
    md += `${project.description}\n\n`;
  }
  
  if (project.tags && project.tags.length > 0) {
    md += `**Tags**: ${project.tags.join(', ')}\n\n`;
  }
  
  if (project.thumbnail) {
    md += `![${project.title}](${project.thumbnail})\n\n`;
  }
  
  return md;
}

// 발행물을 마크다운으로 변환
function formatPublication(publication, index) {
  let md = `## ${publication.title || 'Publication ' + (index + 1)}\n\n`;
  
  if (publication.authors) {
    md += `**Authors**: ${publication.authors}\n\n`;
  }
  
  if (publication.journal) {
    md += `**Journal**: ${publication.journal}\n\n`;
  }
  
  if (publication.time) {
    md += `**Published**: ${publication.time}\n\n`;
  }
  
  if (publication.link) {
    md += `**Link**: [View Publication](${publication.link})\n\n`;
  }
  
  if (publication.abstract) {
    md += `**Abstract**: ${publication.abstract}\n\n`;
  }
  
  if (publication.highlight) {
    md += `**Featured**: Yes\n\n`;
  }
  
  if (publication.thumbnail) {
    md += `![${publication.title}](${publication.thumbnail})\n\n`;
  }
  
  return md;
}

// 수상 내역을 마크다운으로 변환
function formatAward(award, index) {
  let md = `## ${award.title || 'Award ' + (index + 1)}\n\n`;
  
  if (award.organization) {
    md += `**Organization**: ${award.organization}\n\n`;
  }
  
  if (award.time) {
    md += `**Date**: ${award.time}\n\n`;
  }
  
  if (award.description) {
    md += `${award.description}\n\n`;
  }
  
  return md;
}

// 기타 경험을 마크다운으로 변환
function formatOtherExperience(experience, index) {
  let md = `## ${experience.title || 'Experience ' + (index + 1)}\n\n`;
  
  if (experience.organization) {
    md += `**Organization**: ${experience.organization}\n\n`;
  }
  
  if (experience.time) {
    md += `**Period**: ${experience.time}\n\n`;
  }
  
  if (experience.description) {
    md += `${experience.description}\n\n`;
  }
  
  return md;
}

// 메인 실행 함수
async function main() {
  try {
    // CV 데이터 파일 로드
    const cvFilePath = path.join(__dirname, '../src/data/cv.ts');
    console.log('CV 데이터 파일 로드 중...');
    const cvData = await convertTsToJs(cvFilePath);
    
    // Education 데이터 변환
    if (cvData.education && cvData.education.length > 0) {
      console.log('Education 데이터 변환 중...');
      const educationMd = convertArrayToMarkdown(
        cvData.education,
        { title: 'Education', description: 'Academic background and education details' },
        formatEducation
      );
      fs.writeFileSync(path.join(outputDir, 'education.md'), educationMd);
    }
    
    // Experience 데이터 변환
    if (cvData.experiences && cvData.experiences.length > 0) {
      console.log('Experience 데이터 변환 중...');
      const experienceMd = convertArrayToMarkdown(
        cvData.experiences,
        { title: 'Professional Experience', description: 'Work experience and professional career details' },
        formatExperience
      );
      fs.writeFileSync(path.join(outputDir, 'experience.md'), experienceMd);
    }
    
    // Publications 데이터 변환
    if (cvData.publications && cvData.publications.length > 0) {
      console.log('Publications 데이터 변환 중...');
      const publicationsMd = convertArrayToMarkdown(
        cvData.publications,
        { title: 'Publications', description: 'Academic papers and publications' },
        formatPublication
      );
      fs.writeFileSync(path.join(outputDir, 'publications.md'), publicationsMd);
    }
    
    // Projects 데이터 변환
    if (cvData.projects && cvData.projects.length > 0) {
      console.log('Projects 데이터 변환 중...');
      const projectsMd = convertArrayToMarkdown(
        cvData.projects,
        { title: 'Projects', description: 'Personal and professional projects' },
        formatProject
      );
      fs.writeFileSync(path.join(outputDir, 'projects.md'), projectsMd);
    }
    
    // Awards 데이터 변환
    if (cvData.awards && cvData.awards.length > 0) {
      console.log('Awards 데이터 변환 중...');
      const awardsMd = convertArrayToMarkdown(
        cvData.awards,
        { title: 'Awards & Honors', description: 'Recognitions and achievements' },
        formatAward
      );
      fs.writeFileSync(path.join(outputDir, 'awards.md'), awardsMd);
    }
    
    // Other Experiences 데이터 변환
    if (cvData.otherExperiences && cvData.otherExperiences.length > 0) {
      console.log('Other Experiences 데이터 변환 중...');
      const otherExpMd = convertArrayToMarkdown(
        cvData.otherExperiences,
        { title: 'Other Experiences', description: 'Additional professional activities and experiences' },
        formatOtherExperience
      );
      fs.writeFileSync(path.join(outputDir, 'other-experiences.md'), otherExpMd);
    }
    
    // Skills 데이터 변환
    if (cvData.skills && cvData.skills.length > 0) {
      console.log('Skills 데이터 변환 중...');
      const skillsMd = convertArrayToMarkdown(
        cvData.skills,
        { title: 'Skills', description: 'Technical and professional skills' }
      );
      fs.writeFileSync(path.join(outputDir, 'skills.md'), skillsMd);
    }
    
    // 전체 CV 마크다운 생성
    console.log('전체 CV 마크다운 생성 중...');
    let fullCvMd = '---\n';
    fullCvMd += 'title: "Curriculum Vitae"\n';
    fullCvMd += 'description: "Complete CV with education, experience, projects, publications, and skills"\n';
    fullCvMd += '---\n\n';
    
    // 각 섹션에 대한 목차 추가
    fullCvMd += '# Curriculum Vitae\n\n';
    fullCvMd += '## Table of Contents\n\n';
    fullCvMd += '1. [Education](#education)\n';
    fullCvMd += '2. [Professional Experience](#professional-experience)\n';
    fullCvMd += '3. [Projects](#projects)\n';
    fullCvMd += '4. [Publications](#publications)\n';
    fullCvMd += '5. [Awards & Honors](#awards--honors)\n';
    fullCvMd += '6. [Other Experiences](#other-experiences)\n';
    fullCvMd += '7. [Skills](#skills)\n\n';
    
    // 각 섹션 데이터 추가
    if (cvData.education && cvData.education.length > 0) {
      fullCvMd += '## Education\n\n';
      cvData.education.forEach((item, index) => {
        fullCvMd += formatEducation(item, index);
        if (index < cvData.education.length - 1) fullCvMd += '---\n\n';
      });
    }
    
    if (cvData.experiences && cvData.experiences.length > 0) {
      fullCvMd += '## Professional Experience\n\n';
      cvData.experiences.forEach((item, index) => {
        fullCvMd += formatExperience(item, index);
        if (index < cvData.experiences.length - 1) fullCvMd += '---\n\n';
      });
    }
    
    if (cvData.projects && cvData.projects.length > 0) {
      fullCvMd += '## Projects\n\n';
      cvData.projects.forEach((item, index) => {
        fullCvMd += formatProject(item, index);
        if (index < cvData.projects.length - 1) fullCvMd += '---\n\n';
      });
    }
    
    if (cvData.publications && cvData.publications.length > 0) {
      fullCvMd += '## Publications\n\n';
      cvData.publications.forEach((item, index) => {
        fullCvMd += formatPublication(item, index);
        if (index < cvData.publications.length - 1) fullCvMd += '---\n\n';
      });
    }
    
    if (cvData.awards && cvData.awards.length > 0) {
      fullCvMd += '## Awards & Honors\n\n';
      cvData.awards.forEach((item, index) => {
        fullCvMd += formatAward(item, index);
        if (index < cvData.awards.length - 1) fullCvMd += '---\n\n';
      });
    }
    
    if (cvData.otherExperiences && cvData.otherExperiences.length > 0) {
      fullCvMd += '## Other Experiences\n\n';
      cvData.otherExperiences.forEach((item, index) => {
        fullCvMd += formatOtherExperience(item, index);
        if (index < cvData.otherExperiences.length - 1) fullCvMd += '---\n\n';
      });
    }
    
    if (cvData.skills && cvData.skills.length > 0) {
      fullCvMd += '## Skills\n\n';
      cvData.skills.forEach((item, index) => {
        fullCvMd += `### ${item.title}\n\n`;
        fullCvMd += `${item.description}\n\n`;
        if (index < cvData.skills.length - 1) fullCvMd += '---\n\n';
      });
    }
    
    fs.writeFileSync(path.join(outputDir, 'full-cv.md'), fullCvMd);
    
    console.log('변환 완료! 다음 위치에 마크다운 파일이 생성되었습니다:');
    console.log(outputDir);
    
  } catch (error) {
    console.error('오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main(); 