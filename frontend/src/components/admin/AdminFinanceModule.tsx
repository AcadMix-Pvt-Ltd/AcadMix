// @ts-nocheck
import React from 'react';
import FinanceCoreSuite from './FinanceCoreSuite';

const AdminFinanceModule: React.FC = () => {
  return <FinanceCoreSuite defaultView="finance" allowedViews={['finance', 'cashier']} />;
};

export default AdminFinanceModule;
