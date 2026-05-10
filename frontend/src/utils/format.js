import { format, formatDistanceToNow } from 'date-fns';

export const formatCurrency = (amount, symbol = 'Rs.') => {
  if (amount == null || isNaN(amount)) return `${symbol} 0`;
  return `${symbol} ${Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const formatDate = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'dd MMM yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'dd MMM yyyy, hh:mm a');
};

export const formatRelative = (date) => {
  if (!date) return '-';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatNumber = (num) => {
  if (num == null || isNaN(num)) return '0';
  return Number(num).toLocaleString();
};

export const getStatusColor = (status) => {
  const map = {
    completed: 'badge-success', active: 'badge-success', approved: 'badge-success', received: 'badge-success', paid: 'badge-success', open: 'badge-success',
    pending: 'badge-warning', held: 'badge-warning', ordered: 'badge-warning', partial: 'badge-warning', partially_received: 'badge-warning', draft: 'badge-warning',
    voided: 'badge-danger', returned: 'badge-danger', cancelled: 'badge-danger', inactive: 'badge-danger', rejected: 'badge-danger', unpaid: 'badge-danger', closed: 'badge-info',
  };
  return map[status] || 'badge-info';
};

export const getRoleLabel = (role) => {
  const map = { superadmin: 'Super Admin', businessadmin: 'Business Admin', manager: 'Manager', cashier: 'Cashier' };
  return map[role] || role;
};

export const getRoleBadge = (role) => {
  const map = { superadmin: 'badge-purple', businessadmin: 'badge-info', manager: 'badge-warning', cashier: 'badge-success' };
  return map[role] || 'badge-info';
};
