export const formatCurrency = (amount) => {
  if (!amount) return '0 đ';
  return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

export const formatDate = (dateString) => {
  // Dùng dayjs hoặc new Date()
  return new Date(dateString).toLocaleDateString('vi-VN');
};