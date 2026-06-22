// Kiểm tra URL ảnh có hợp lệ để hiển thị trên web không
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  // Loại bỏ đường dẫn local từ mobile app (Android/iOS cache)
  if (url.startsWith('file://') || url.startsWith('/data/') || url.startsWith('content://')) return false;
  // Chỉ chấp nhận http/https
  return url.startsWith('http://') || url.startsWith('https://');
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80', // Cozy apartment
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80', // Bright interior
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80', // Modern living room
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=600&q=80', // Modern kitchen
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80', // Beautiful bedroom
];

const getFallbackImage = (id) => {
  if (!id) return FALLBACK_IMAGES[0];
  // Chọn ảnh cố định theo ID để không bị thay đổi mỗi khi tải lại trang
  const num = typeof id === 'number' ? id : String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_IMAGES[num % FALLBACK_IMAGES.length];
};

export const getImageUrl = (item) => {
  if (!item) return FALLBACK_IMAGES[0];
  
  const fallback = getFallbackImage(item.id);

  if (item.thumbnail && isValidImageUrl(item.thumbnail)) return item.thumbnail;

  // Nếu images là mảng chuẩn
  if (Array.isArray(item.images) && item.images.length > 0) {
    const validImg = item.images.find(isValidImageUrl);
    return validImg || fallback;
  }

  // Nếu images là chuỗi JSON stringified từ Database (VD: '["https://..."]')
  if (typeof item.images === 'string') {
    try {
      const parsed = JSON.parse(item.images);
      if (Array.isArray(parsed)) {
        const validImg = parsed.find(isValidImageUrl);
        return validImg || fallback;
      }
    } catch (e) {
      // Fallback nếu chuỗi không phải JSON mảng mà là 1 link URL đơn thuần
      if (isValidImageUrl(item.images)) return item.images;
    }
  }

  return fallback;
};

export { isValidImageUrl };
