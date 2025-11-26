import { HydratedDocument, Model, Schema, model } from 'mongoose';

export type EmployeeStatus = 'activo' | 'inactivo';

export interface EmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  area: string;
  position: string;
  status?: EmployeeStatus;
  hireDate?: Date;
  deactivatedAt?: Date | null;
  notes?: string;
}

export type EmployeeDocument = HydratedDocument<EmployeeInput>;

const employeeSchema = new Schema<EmployeeInput>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    area: {
      type: String,
      required: true,
      trim: true
    },
    position: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo'
    },
    hireDate: {
      type: Date,
      default: Date.now
    },
    deactivatedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

const Employee: Model<EmployeeInput> = model<EmployeeInput>('Employee', employeeSchema);

export default Employee;
