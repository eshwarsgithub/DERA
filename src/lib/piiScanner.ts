export type PiiType =
  | 'Email'
  | 'Phone'
  | 'FirstName'
  | 'LastName'
  | 'Address'
  | 'DOB'
  | 'SSN'
  | 'Other';

export interface FieldDescriptor {
  name: string;
  dataType?: string;
}

export interface PiiResult {
  isPII: boolean;
  piiType?: PiiType;
  sensitivityScore: number; // 0..100
}

const patterns: Array<{ rx: RegExp; type: PiiType; score: number }> = [
  { rx: /email|e-mail|mail/i, type: 'Email', score: 50 },
  { rx: /phone|mobile|msisdn/i, type: 'Phone', score: 40 },
  { rx: /first(name)?|given/i, type: 'FirstName', score: 25 },
  { rx: /last(name)?|family/i, type: 'LastName', score: 25 },
  { rx: /address|street|city|zip|postcode/i, type: 'Address', score: 35 },
  { rx: /dob|birth/i, type: 'DOB', score: 60 },
  { rx: /ssn|sin/i, type: 'SSN', score: 90 },
];

// Pre-compile regex for dataType check to avoid re-creation on each call
const EMAIL_DATATYPE_RX = /email/i;

export function scanField(field: FieldDescriptor): PiiResult {
  const name = field.name || '';
  for (const p of patterns) {
    if (p.rx.test(name)) {
      return { isPII: true, piiType: p.type, sensitivityScore: p.score };
    }
  }
  if (EMAIL_DATATYPE_RX.test(field.dataType ?? '')) return { isPII: true, piiType: 'Email', sensitivityScore: 50 };
  return { isPII: false, sensitivityScore: 0 };
}
