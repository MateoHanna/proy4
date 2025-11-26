import { HydratedDocument, Model, Schema, Types, model } from 'mongoose';

export type EmployeeHistoryAction = 'crear' | 'actualizar' | 'baja';

export interface ChangeEntry {
  field: string;
  from: unknown;
  to: unknown;
}

export interface EmployeeHistoryInput {
  employee: Types.ObjectId;
  action: EmployeeHistoryAction;
  changes: ChangeEntry[];
  performedBy?: string;
}

export type EmployeeHistoryDocument = HydratedDocument<EmployeeHistoryInput>;

const changeSchema = new Schema<ChangeEntry>(
  {
    field: String,
    from: Schema.Types.Mixed,
    to: Schema.Types.Mixed
  },
  { _id: false }
);

const employeeHistorySchema = new Schema<EmployeeHistoryInput>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    action: {
      type: String,
      enum: ['crear', 'actualizar', 'baja'],
      required: true
    },
    changes: [changeSchema],
    performedBy: {
      type: String,
      default: 'sistema'
    }
  },
  {
    timestamps: true
  }
);

const EmployeeHistory: Model<EmployeeHistoryInput> = model<EmployeeHistoryInput>(
  'EmployeeHistory',
  employeeHistorySchema
);

export default EmployeeHistory;
