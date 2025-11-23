const mongoose = require('mongoose');

const changeSchema = new mongoose.Schema(
  {
    field: String,
    from: mongoose.Schema.Types.Mixed,
    to: mongoose.Schema.Types.Mixed
  },
  { _id: false }
);

const employeeHistorySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
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

module.exports = mongoose.model('EmployeeHistory', employeeHistorySchema);
