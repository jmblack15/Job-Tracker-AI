import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { GeneratedCvData } from '@/types';

const LABELS = {
  es: {
    summary: 'RESUMEN PROFESIONAL',
    experience: 'EXPERIENCIA',
    education: 'EDUCACIÓN',
    skills: 'HABILIDADES',
    certifications: 'CERTIFICACIONES',
    projects: 'PROYECTOS',
    technical: 'Técnicas:',
    soft: 'Blandas:',
    languages: 'Idiomas:',
  },
  en: {
    summary: 'PROFESSIONAL SUMMARY',
    experience: 'EXPERIENCE',
    education: 'EDUCATION',
    skills: 'SKILLS',
    certifications: 'CERTIFICATIONS',
    projects: 'PROJECTS',
    technical: 'Technical:',
    soft: 'Soft Skills:',
    languages: 'Languages:',
  },
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111',
    lineHeight: 1.4,
  },
  name: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  contactLine: {
    textAlign: 'center',
    fontSize: 9,
    color: '#333',
    marginBottom: 10,
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    borderBottomWidth: 0.5,
    borderBottomColor: '#555',
    paddingBottom: 2,
    marginBottom: 5,
    marginTop: 12,
    letterSpacing: 0.3,
  },
  summaryText: {
    fontSize: 9.5,
    lineHeight: 1.5,
  },
  expBlock: {
    marginBottom: 7,
  },
  expRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  expCompany: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  expPeriod: {
    fontSize: 9,
    color: '#444',
  },
  expPosition: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 9.5,
    marginBottom: 3,
  },
  expLocation: {
    fontSize: 9,
    color: '#555',
    marginBottom: 2,
  },
  bullet: {
    fontSize: 9.5,
    marginLeft: 8,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  eduBlock: {
    marginBottom: 6,
  },
  eduRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  eduInstitution: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  eduPeriod: {
    fontSize: 9,
    color: '#444',
  },
  eduDegree: {
    fontSize: 9.5,
    marginBottom: 1,
  },
  skillRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  skillLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    minWidth: 72,
  },
  skillValue: {
    fontSize: 9.5,
    flex: 1,
    lineHeight: 1.4,
  },
  certBlock: {
    marginBottom: 4,
  },
  certName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
  },
  certDetail: {
    fontSize: 9,
    color: '#444',
  },
  projBlock: {
    marginBottom: 5,
  },
  projName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
  },
  projDesc: {
    fontSize: 9.5,
    lineHeight: 1.4,
    marginBottom: 1,
  },
  projTech: {
    fontSize: 9,
    color: '#444',
    fontFamily: 'Helvetica-Oblique',
  },
});

interface Props {
  cv: GeneratedCvData;
  language: 'es' | 'en';
}

function buildContact(info: GeneratedCvData['personal_info']) {
  return [info.email, info.phone, info.linkedin, info.location]
    .filter(Boolean)
    .join('  |  ');
}

export function CvPdfDocument({ cv, language }: Props) {
  const L = LABELS[language];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.name}>{cv.personal_info.full_name}</Text>
        <Text style={styles.contactLine}>{buildContact(cv.personal_info)}</Text>
        <View style={styles.divider} />

        {/* Professional Summary */}
        {cv.professional_summary && (
          <>
            <Text style={styles.sectionTitle}>{L.summary}</Text>
            <Text style={styles.summaryText}>{cv.professional_summary}</Text>
          </>
        )}

        {/* Experience */}
        {cv.experience.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{L.experience}</Text>
            {cv.experience.map((exp, i) => (
              <View key={i} style={styles.expBlock}>
                <View style={styles.expRow}>
                  <Text style={styles.expCompany}>{exp.company}</Text>
                  <Text style={styles.expPeriod}>{exp.period}</Text>
                </View>
                <Text style={styles.expPosition}>{exp.position}</Text>
                {exp.location && <Text style={styles.expLocation}>{exp.location}</Text>}
                {exp.bullets.map((b, j) => (
                  <Text key={j} style={styles.bullet}>{b}</Text>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Education */}
        {cv.education.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{L.education}</Text>
            {cv.education.map((edu, i) => (
              <View key={i} style={styles.eduBlock}>
                <View style={styles.eduRow}>
                  <Text style={styles.eduInstitution}>{edu.institution}</Text>
                  <Text style={styles.eduPeriod}>{edu.period}</Text>
                </View>
                <Text style={styles.eduDegree}>{edu.degree}</Text>
                {edu.details && <Text style={styles.certDetail}>{edu.details}</Text>}
              </View>
            ))}
          </>
        )}

        {/* Skills */}
        <Text style={styles.sectionTitle}>{L.skills}</Text>
        {cv.skills.technical.length > 0 && (
          <View style={styles.skillRow}>
            <Text style={styles.skillLabel}>{L.technical}</Text>
            <Text style={styles.skillValue}>{cv.skills.technical.join(', ')}</Text>
          </View>
        )}
        {cv.skills.soft.length > 0 && (
          <View style={styles.skillRow}>
            <Text style={styles.skillLabel}>{L.soft}</Text>
            <Text style={styles.skillValue}>{cv.skills.soft.join(', ')}</Text>
          </View>
        )}
        {cv.skills.languages.length > 0 && (
          <View style={styles.skillRow}>
            <Text style={styles.skillLabel}>{L.languages}</Text>
            <Text style={styles.skillValue}>{cv.skills.languages.join(', ')}</Text>
          </View>
        )}

        {/* Certifications */}
        {cv.certifications.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{L.certifications}</Text>
            {cv.certifications.map((cert, i) => (
              <View key={i} style={styles.certBlock}>
                <Text style={styles.certName}>{cert.name}</Text>
                <Text style={styles.certDetail}>{cert.issuer}{cert.date ? ` — ${cert.date}` : ''}</Text>
              </View>
            ))}
          </>
        )}

        {/* Projects */}
        {cv.projects.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{L.projects}</Text>
            {cv.projects.map((proj, i) => (
              <View key={i} style={styles.projBlock}>
                <Text style={styles.projName}>{proj.name}</Text>
                <Text style={styles.projDesc}>{proj.description}</Text>
                {proj.technologies && <Text style={styles.projTech}>{proj.technologies}</Text>}
              </View>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}
