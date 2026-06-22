import React, { useEffect, useState } from 'react';
import { DEFAULT_PROVINCE_IMAGE, getProvinceImage } from '../../data/provinceImageStore';

const ProvinceImage = ({ provinceName, alt, className = '' }) => {
  const [src, setSrc] = useState(getProvinceImage(provinceName));

  useEffect(() => {
    setSrc(getProvinceImage(provinceName));
  }, [provinceName]);

  return (
    <img
      src={src}
      alt={alt || provinceName || 'Khu vực'}
      className={className}
      loading="lazy"
      onError={() => setSrc(DEFAULT_PROVINCE_IMAGE)}
    />
  );
};

export default ProvinceImage;