import provinceData from './province.json';

const DEFAULT_IMAGE = '/images/provinces/default.jpg';

const normalizeText = (value = '') => {
  return String(value)
    .toLowerCase()
    .replace(/^tỉnh\s+/i, '')
    .replace(/^thành phố\s+/i, '')
    .replace(/^tp\.?\s+/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getProvinceMeta = (provinceName) => {
  const target = normalizeText(provinceName);

  return Object.values(provinceData || {}).find((item) => {
    return (
      normalizeText(item.name) === target ||
      normalizeText(item.name_with_type) === target ||
      normalizeText(item.slug) === target
    );
  });
};

export const getProvinceImage = (provinceName) => {
  const province = getProvinceMeta(provinceName);

  if (!province?.slug) {
    return DEFAULT_IMAGE;
  }

  return `/images/provinces/${province.slug}.jpg`;
};

export const DEFAULT_PROVINCE_IMAGE = DEFAULT_IMAGE;