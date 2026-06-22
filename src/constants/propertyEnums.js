export const PROPERTY_TYPE_LABELS = {
  ROOM: 'Phòng trọ',
  APARTMENT: 'Căn hộ',
  HOUSE: 'Nhà nguyên căn',
  VILLA: 'Biệt thự',
  COMMERCIAL: 'Mặt bằng kinh doanh',
};

export const TRANSACTION_TYPE_LABELS = {
  FOR_RENT: 'Cho thuê',
  FOR_SALE: 'Bán',
};

export const FURNISHING_STATUS_LABELS = {
  UNFURNISHED: 'Nhà trống',
  PARTIALLY_FURNISHED: 'Nội thất cơ bản',
  FULLY_FURNISHED: 'Đầy đủ nội thất',
};

export const AVAILABILITY_STATUS_LABELS = {
  IMMEDIATELY: 'Vào ở ngay',
  THIS_MONTH: 'Trong tháng này',
  NEXT_MONTH: 'Đầu tháng sau',
  NEGOTIABLE: 'Thỏa thuận',
};

export const UTILITY_PRICE_TYPE_LABELS = {
  FREE: 'Miễn phí',
  STATE_PRICE: 'Theo giá nhà nước',
  LANDLORD_PRICE: 'Theo quy định chủ nhà',
  SHARED: 'Chia đều',
  NEGOTIABLE: 'Thỏa thuận',
};

export const LEGAL_DOCUMENT_TYPE_LABELS = {
  NONE: 'Không cung cấp',
  CERTIFICATE_OF_OWNERSHIP: 'Sổ đỏ / Sổ hồng',
  LEASE_CONTRACT: 'Hợp đồng thuê',
  AUTHORIZATION_LETTER: 'Giấy ủy quyền',
};

export const formatEnumLabel = (map, value, fallback = 'Chưa cập nhật') => {
  if (value === null || value === undefined || value === '') return fallback;
  return map[value] || value;
};

export const formatBooleanLabel = (value, fallback = 'Chưa cập nhật') => {
  if (value === null || value === undefined) return fallback;
  return value ? 'Có' : 'Không';
};