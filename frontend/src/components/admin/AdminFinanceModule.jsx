import React from 'react';
import FinanceCoreSuite from './FinanceCoreSuite';

const AdminFinanceModule = () => {
  return <FinanceCoreSuite defaultView="finance" allowedViews={['finance', 'cashier']} />;
};

export default AdminFinanceModule;
