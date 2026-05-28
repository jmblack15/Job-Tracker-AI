import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { CoverLetterData, ParsedCvContent } from '@/types';

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 64,
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    color: '#111',
    lineHeight: 1.6,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  contactLine: {
    fontSize: 9,
    color: '#444',
    marginBottom: 12,
  },
  divider: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
    marginBottom: 16,
  },
  dateRight: {
    textAlign: 'right',
    fontSize: 9.5,
    color: '#555',
    marginBottom: 14,
  },
  salutation: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 10.5,
    lineHeight: 1.7,
    marginBottom: 16,
    textAlign: 'justify',
  },
  closing: {
    marginTop: 20,
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  signature: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
});

interface Props {
  letter: CoverLetterData;
  candidate?: ParsedCvContent | null;
  language: 'es' | 'en';
}

function buildContact(candidate: ParsedCvContent | null | undefined) {
  if (!candidate) return '';
  return [candidate.email, candidate.phone, candidate.linkedin, candidate.location]
    .filter(Boolean)
    .join('  |  ');
}

function formatDate(language: 'es' | 'en') {
  return new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function CoverLetterPdfDocument({ letter, candidate, language }: Props) {
  const contact = buildContact(candidate);
  const paragraphs = letter.body.split(/\n\n+/).filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        {letter.signature && <Text style={styles.name}>{letter.signature}</Text>}
        {contact && <Text style={styles.contactLine}>{contact}</Text>}
        <View style={styles.divider} />

        {/* Date */}
        <Text style={styles.dateRight}>{formatDate(language)}</Text>

        {/* Salutation */}
        {letter.salutation && <Text style={styles.salutation}>{letter.salutation}</Text>}

        {/* Body */}
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.bodyText}>{p}</Text>
        ))}

        {/* Closing */}
        <Text style={styles.closing}>{letter.closing}</Text>
        <Text style={styles.signature}>{letter.signature}</Text>
      </Page>
    </Document>
  );
}
