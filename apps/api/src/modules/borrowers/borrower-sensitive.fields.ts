import { Borrower } from '@prisma/client';
import { UpdateBorrowerDto } from './dto/borrower.dto';

/** Campos vinculados a identidad legal del prestatario */
export const BORROWER_SENSITIVE_FIELDS = [
  'documentNum',
  'documentType',
  'firstName',
  'lastName',
  'residenceAddress',
] as const;

export type BorrowerSensitiveField = (typeof BORROWER_SENSITIVE_FIELDS)[number];

export function getSensitiveFieldChanges(
  before: Borrower,
  dto: UpdateBorrowerDto,
): BorrowerSensitiveField[] {
  const changes: BorrowerSensitiveField[] = [];

  if (dto.documentNum !== undefined && dto.documentNum.trim() !== before.documentNum) {
    changes.push('documentNum');
  }
  if (
    dto.documentType !== undefined &&
    (dto.documentType || 'CC') !== before.documentType
  ) {
    changes.push('documentType');
  }
  if (dto.firstName !== undefined && dto.firstName.trim() !== before.firstName) {
    changes.push('firstName');
  }
  if (dto.lastName !== undefined && dto.lastName.trim() !== before.lastName) {
    changes.push('lastName');
  }
  if (
    dto.residenceAddress !== undefined &&
    dto.residenceAddress.trim() !== (before.residenceAddress || before.address || '')
  ) {
    changes.push('residenceAddress');
  }

  return changes;
}

export const SENSITIVE_FIELD_LABELS: Record<BorrowerSensitiveField, string> = {
  documentNum: 'cédula',
  documentType: 'tipo de documento',
  firstName: 'nombre',
  lastName: 'apellido',
  residenceAddress: 'dirección de residencia',
};
