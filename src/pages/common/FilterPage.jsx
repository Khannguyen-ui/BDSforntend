import React, { useEffect, useState } from 'react';
import {
  Button, Card, Row, Col, Tag, Spin, Empty, Select,
  ConfigProvider, Avatar, Divider,
  Popover, Slider, InputNumber, Input, Radio, message,
  Pagination, Drawer, App
} from 'antd';
import {
  EnvironmentOutlined, HeartOutlined, UserOutlined, FilterOutlined,
  AppstoreOutlined, UnorderedListOutlined, EnvironmentFilled,
  DownOutlined, CameraFilled, SearchOutlined, AimOutlined, CrownFilled, FireFilled
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import roomService from '../../services/roomService';
import { formatCurrency } from '../../utils/format';
import { getImageUrl } from '../../utils/imageHelper';
import provinceData from '../../data/province.json';
import wardData from '../../data/ward.json';


dayjs.extend(relativeTime);
dayjs.locale('vi');


const { Option } = Select;


// Options cho các bộ lọc
const BEDROOM_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const BATHROOM_OPTIONS = [1, 2, 3, 4, 5, 6];
const FURNITURE_OPTIONS = [
  { label: 'Đầy đủ nội thất', value: 'FULLY_FURNISHED' },
  { label: 'Nội thất cơ bản', value: 'PARTIALLY_FURNISHED' },
  { label: 'Nhà trống', value: 'UNFURNISHED' }
];

// ==============================================================================
// 1. COMPONENT MỚI: NHẬP ĐỊA ĐIỂM ĐỂ TÌM PHÒNG QUANH ĐÓ
// ==============================================================================
const NearbyAmenitiesContent = ({ onClose, onApply }) => {
  const { message: appMessage } = App.useApp();
  const [keyword, setKeyword] = useState('');


  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(2000);




  const quickTags = [
    { label: 'ĐH Hutech', search: 'Đại học Hutech' },
    { label: 'ĐH Bách Khoa', search: 'Đại học Bách Khoa TP HCM' },
    { label: 'BV Chợ Rẫy', search: 'Bệnh viện Chợ Rẫy' },
    { label: 'Sân bay TSN', search: 'Sân bay Tân Sơn Nhất' },
    { label: 'Landmark 81', search: 'Landmark 81' },
  ];

  const searchLocationAnchor = async (query) => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 5,
          countrycodes: 'vn'
        }
      });
      setSuggestions(res.data);
    } catch (error) {
      appMessage.error("Lỗi kết nối định vị");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnchor = (place) => {
    const shortName = place.name || place.display_name.split(',')[0];
    onApply({
      name: shortName,
      fullText: place.display_name,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      radius: radius
    });
    onClose();
  };

  return (
    <div className="w-[380px] p-3 bg-white font-sans">
      <div className="text-center mb-4">
        <h4 className="font-bold text-gray-800 text-base m-0">Bạn muốn tìm phòng ở gần đâu?</h4>
        <span className="text-xs text-gray-500">Nhập trường học, công ty, bệnh viện... để xem phòng quanh đó</span>
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          placeholder="VD: Đại học FPT, Aeon Mall Tân Phú..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => searchLocationAnchor(keyword)}
          prefix={<EnvironmentOutlined className="text-[#f96302]" />}
          className="rounded-md"
        />
        <Button type="primary" className="bg-[#f96302] border-none" loading={loading} onClick={() => searchLocationAnchor(keyword)}>
          Tìm kiếm
        </Button>
      </div>

      <Button
        className="w-full mb-4 flex items-center justify-center gap-2 text-[#f96302] border-[#f96302] hover:bg-orange-50 font-bold rounded-md"
        onClick={() => {
          if (!navigator.geolocation) {
            appMessage.error("Trình duyệt không hỗ trợ định vị!");
            return;
          }
          appMessage.loading({ content: "Đang lấy vị trí...", key: "loc" });
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              appMessage.success({ content: "Đã lấy vị trí thành công!", key: "loc" });
              onApply({
                name: "Vị trí của bạn",
                fullText: "Vị trí hiện tại",
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                radius: radius
              });
              onClose();
            },
            (err) => {
              appMessage.error({ content: "Không thể lấy vị trí. Hãy bật GPS/Quyền vị trí!", key: "loc" });
            },
            { enableHighAccuracy: true }
          );
        }}
      >
        <AimOutlined /> Tìm quanh vị trí của bạn
      </Button>

      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-2">Gợi ý điểm đến phổ biến:</div>
        <div className="flex flex-wrap gap-2">
          {quickTags.map((tag, idx) => (
            <Tag
              key={idx}
              className="cursor-pointer hover:border-[#f96302] hover:text-[#f96302] transition-all px-2 py-1 bg-gray-50 border-gray-200"
              onClick={() => {
                setKeyword(tag.search);
                searchLocationAnchor(tag.search);
              }}
            >
              {tag.label}
            </Tag>
          ))}
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div className="mb-4 px-1">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Tìm phòng trong bán kính:</span>
          <span className="font-bold text-[#f96302]">{radius < 1000 ? `${radius}m` : `${radius / 1000}km`}</span>
        </div>
        <Slider
          min={500} max={10000} step={500}
          value={radius} onChange={setRadius}
          trackStyle={{ backgroundColor: '#f96302' }}
          handleStyle={{ borderColor: '#f96302', backgroundColor: '#f96302', boxShadow: 'none' }}
        />
      </div>

      {suggestions.length > 0 && (
        <div className="border border-gray-100 rounded-md overflow-hidden">
          <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-500 font-medium border-b border-gray-100">
            Chọn địa điểm chính xác để quét phòng:
          </div>
          <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
            {suggestions.map((item) => (
              <div
                key={item.place_id}
                className="p-2.5 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0 flex gap-3 items-start transition-colors group"
                onClick={() => handleSelectAnchor(item)}
              >
                <EnvironmentFilled className="mt-1 text-gray-300 group-hover:text-[#f96302]" />
                <div>
                  <div className="font-bold text-sm text-gray-800 line-clamp-1 group-hover:text-[#f96302]">
                    {item.name || item.display_name.split(',')[0]}
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                    {item.display_name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length === 0 && !loading && keyword && (
        <div className="text-center text-gray-400 text-sm py-4 italic">
          Không tìm thấy địa điểm này. Hãy thử từ khóa khác (VD: Quận, Đường...)
        </div>
      )}
    </div>
  );
};

const LocationSelectContent = ({ onClose, onApply }) => {
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [tempProv, setTempProv] = useState(null);
  const [tempWard, setTempWard] = useState(null);

  useEffect(() => {
    // Chuyển object thành mảng
    const provArray = Object.values(provinceData || {});
    setProvinces(provArray);
  }, []);

  const handleProvChange = (val, opt) => {
    setTempProv({ code: val, name: opt.children });
    setTempWard(null);
    const filteredWards = Object.values(wardData || {}).filter(w => w.parent_code === String(val));
    setWards(filteredWards);
  };

  const handleApply = () => {
    const fullText = [tempWard?.name, tempProv?.name].filter(Boolean).join(', ');
    onApply({ province: tempProv, district: null, ward: tempWard, fullText, displayName: fullText || "Toàn quốc" });
    onClose();
  };

  return (
    <div className="w-[320px] p-4">
      <div className="mb-5 text-center">
        <h4 className="font-bold text-gray-800 text-base m-0 uppercase tracking-tight">Chọn khu vực tìm kiếm</h4>
        <div className="text-[11px] text-gray-400 mt-1 uppercase">Vui lòng chọn địa điểm chi tiết</div>
      </div>
      <div className="flex flex-col gap-4">
        <Select
          size="large"
          showSearch
          placeholder="Tỉnh/Thành"
          className="w-full custom-select-location"
          onChange={handleProvChange}
          optionFilterProp="children"
        >
          {provinces.map(p => <Option key={p.code} value={p.code}>{p.name_with_type || p.name}</Option>)}
        </Select>

        <Select
          size="large"
          showSearch
          placeholder="Phường/Xã"
          className="w-full custom-select-location"
          onChange={(val, opt) => setTempWard({ code: val, name: opt.children })}
          disabled={!tempProv}
          value={tempWard?.code}
          optionFilterProp="children"
        >
          {wards.map(w => <Option key={w.code} value={w.code}>{w.name_with_type || w.name}</Option>)}
        </Select>

        <Button
          type="primary"
          size="large"
          className="mt-2 font-bold h-12 w-full rounded-lg bg-[#f96302] hover:bg-[#e05a02] shadow-sm transition-all border-none"
          onClick={handleApply}
        >
          Áp dụng
        </Button>
      </div>
    </div>
  );
};



const FilterPage = () => {
  const { message: appMessage } = App.useApp();

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [totalElements, setTotalElements] = useState(0);

  const getInitialFilters = () => {
    if (
      searchParams.get('lat') ||
      searchParams.get('keyword') ||
      searchParams.get('province') ||
      searchParams.get('projectId')
    ) {
      return {
        keyword: searchParams.get('keyword') || '',
        type: searchParams.get('type') || 'ALL',
        locationName: searchParams.get('locationName') || 'Vị trí đã chọn',
        locationCoords: searchParams.get('lat') ? {
          lat: parseFloat(searchParams.get('lat')),
          lng: parseFloat(searchParams.get('lng'))
        } : null,
        radius: parseInt(searchParams.get('radius') || '20000'),
        province: searchParams.get('province') || undefined,
        district: searchParams.get('district') || undefined,
        ward: searchParams.get('ward') || undefined,
        projectId: searchParams.get('projectId') || undefined,
      };
    }


    const state = location.state || {}; // Lấy state hoặc rỗng

    return {
      keyword: state.keyword || '',
      type: state.type || 'ALL',
      locationName: state.locationName || 'Toàn quốc',

      locationCoords: state.locationCoords || null,

      radius: state.radius || undefined,
      province: state.province || undefined,
      district: state.district || undefined,
      ward: state.ward || undefined
    };
  };

  const [filters, setFilters] = useState(getInitialFilters);

  // State quản lý dữ liệu
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);

  const [viewMode, setViewMode] = useState('list');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // State Popover Header
  const [openLocation, setOpenLocation] = useState(false);
  const [openAmenities, setOpenAmenities] = useState(false);
  const [openFilterDrawer, setOpenFilterDrawer] = useState(false);

  // --- STATE BỘ LỌC NÂNG CAO ---
  const [priceRange, setPriceRange] = useState([0, 100000000]);
  const [selectedBedrooms, setSelectedBedrooms] = useState([]);
  const [selectedBathrooms, setSelectedBathrooms] = useState([]);
  const [areaRange, setAreaRange] = useState({ min: null, max: null });
  const [selectedFurniture, setSelectedFurniture] = useState([]); // Chuyển thành mảng
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedProject, setSelectedProject] = useState(undefined);
  const [transactionType, setTransactionType] = useState('ALL'); // Thêm loại giao dịch
  const [activeTab, setActiveTab] = useState('ALL'); // Cá nhân, môi giới
  const [sortOrder, setSortOrder] = useState('newest'); // Tin mới nhất

  // Dữ liệu danh mục
  const [amenitiesList, setAmenitiesList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);

  // Lấy dữ liệu danh mục khi khởi tạo
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [amenitiesRes, projectsRes] = await Promise.all([
          roomService.getAllAmenities(),
          roomService.getPublicProjects()
        ]);
        setAmenitiesList(amenitiesRes.data || []);

        // getPublicProjects trả về phân trang
        const projData = projectsRes.data?.content || projectsRes.data?.result?.content || projectsRes.data || [];
        setProjectsList(Array.isArray(projData) ? projData : []);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu danh mục:", error);
      }
    };
    fetchMasterData();
  }, []);
  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');

    if (projectIdFromUrl) {
      setSelectedProject(Number(projectIdFromUrl));
      setCurrentPage(1);
    } else {
      setSelectedProject(undefined);
    }
  }, [searchParams]);

  useEffect(() => {
    const lat = searchParams.get('lat');
    if (lat) {
      setFilters(getInitialFilters());
    }
  }, [searchParams]);

  // --- GỌI API LẤY PHÒNG ---
  useEffect(() => {
    setCurrentPage(1); // Reset page về 1 khi đổi sort
    fetchRooms(1);
  }, [sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchRooms();
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trong file FilterPage.jsx

  const fetchRooms = async (pageOverride, filtersOverride = null) => {
    setLoading(true);
    try {
      const activeFilters = filtersOverride || filters;
      // Truyền đầy đủ tham số tìm kiếm khớp với SearchController backend
      const params = {
        page: (pageOverride !== undefined ? pageOverride : currentPage) - 1,
        size: pageSize,
        // Từ khoá
        keyword: activeFilters.keyword || undefined,
        // Toạ độ & bán kính
        latitude: activeFilters.locationCoords?.lat || undefined,
        longitude: activeFilters.locationCoords?.lng || undefined,
        radius: activeFilters.radius || undefined,
        // Hành chính
        province: activeFilters.province || undefined,
        district: undefined,
        ward: activeFilters.ward || undefined,
        // Loại phòng (ALL -> không gửi để backend trả hết)
        propertyType: activeFilters.type !== 'ALL' ? activeFilters.type : undefined,
        // Loại giao dịch
        transactionTypes: transactionType,
        // Giá
        minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
        maxPrice: priceRange[1] < 100000000 ? priceRange[1] : undefined,
        // Diện tích
        minArea: areaRange.min || undefined,
        maxArea: areaRange.max || undefined,
        // Số phòng ngủ (gửi giá trị đầu tiên nếu chọn 1, hoặc gửi list)
        bedrooms: selectedBedrooms.length > 0 ? selectedBedrooms.join(',') : undefined,
        // Số phòng vệ sinh
        bathrooms: selectedBathrooms.length > 0 ? selectedBathrooms.join(',') : undefined,
        // Nội thất (chuyển sang list ENUM)
        furnishingStatuses: selectedFurniture.length > 0 ? selectedFurniture : undefined,

        // --- CÁC TRƯỜNG LỌC NÂNG CAO MỚI ---
        amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
        projectId: selectedProject || undefined,

        // Sắp xếp
        sortBy: sortOrder === 'newest' ? 'createdAt' : (sortOrder === 'price_asc' || sortOrder === 'price_desc' ? 'price' : undefined),
        sortDir: sortOrder === 'newest' ? 'desc' : (sortOrder === 'price_asc' ? 'asc' : 'desc'),

      };

      const res = await roomService.searchRooms(params);

      let data = res.data.content || [];

      // Lọc bỏ tin đã ẩn hoặc hết hạn
      data = data.filter(item => {
        if (item.status === 'EXPIRED' || item.status === 'HIDDEN') return false;
        if (item.expiresAt && new Date(item.expiresAt) < new Date()) return false;
        return true;
      });

      setTotalElements(data.length > 0 ? res.data.totalElements : 0);

      // Ưu tiên VIP lên đầu (client-side sort)
      data.sort((a, b) => {
        const priorityA = a.priorityLevel || 0;
        const priorityB = b.priorityLevel || 0;
        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      const mappedData = data.map(r => ({
        ...r,
        time: r.approvedAt ? dayjs(r.approvedAt).fromNow() : (r.createdAt ? dayjs(r.createdAt).fromNow() : 'Vừa xong'),
        isVip: r.priorityLevel && r.priorityLevel > 0
      }));

      setRooms(mappedData);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error(error);
      appMessage.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchRooms(1);
  }, [selectedProject]);



  const handleApplyLocation = async (locData) => {
    if (!locData.fullText) return;

    appMessage.loading({ content: `Đã chọn vị trí mới`, key: 'geo' });

    const newFilters = {
      ...filters,
      locationName: locData.displayName,
      locationCoords: locData.locationCoords || null,
      province: locData.province?.name,
      district: undefined,
      ward: locData.ward?.name,
      radius: locData.locationCoords ? (filters.radius || 20000) : undefined
    };

    setFilters(newFilters);

    const newParams = {
      locationName: locData.displayName
    };

    if (locData.locationCoords) {
      newParams.lat = locData.locationCoords.lat;
      newParams.lng = locData.locationCoords.lng;
      newParams.radius = filters.radius || 20000;
    }

    if (locData.province?.name) {
      newParams.province = locData.province.name;
    }

    if (locData.ward?.name) {
      newParams.ward = locData.ward.name;
    }
    if (selectedProject) {
      newParams.projectId = selectedProject;
    }
    setSearchParams(newParams);

    appMessage.success({ content: `Đã chọn: ${locData.displayName}`, key: 'geo' });
    setCurrentPage(1);
    fetchRooms(1, newFilters);
  };

  // HÀM XỬ LÝ KHI CHỌN TIỆN ÍCH (Anchor point)
  const handleApplyAmenities = (data) => {
    const newFilters = {
      ...filters,
      locationName: `Gần ${data.name}`,
      locationCoords: { lat: data.lat, lng: data.lng },
      radius: data.radius,
      province: undefined,
      district: undefined,
      ward: undefined
    };

    setFilters(newFilters);

    const nextParams = {
      locationName: `Gần ${data.name}`,
      lat: data.lat,
      lng: data.lng,
      radius: data.radius
    };

    if (selectedProject) {
      nextParams.projectId = selectedProject;
    }

    setSearchParams(nextParams);

    appMessage.success(`Đã chọn vị trí: ${data.name}`);
    setCurrentPage(1);
    fetchRooms(1, newFilters);
  };

  // --- HÀM RESET TOÀN BỘ BỘ LỌC (MỚI) ---
  const handleResetAll = () => {
    setPriceRange([0, 100000000]);
    setSelectedBedrooms([]);
    setSelectedBathrooms([]);
    setAreaRange({ min: null, max: null });
    setSelectedFurniture([]);
    setSelectedAmenities([]);
    setSelectedProject(undefined);
    setTransactionType('ALL');

    // Reset bộ lọc chính về Toàn quốc
    const resetFilters = {
      keyword: '',
      type: 'ALL',
      locationName: 'Toàn quốc',
      locationCoords: null,
      radius: undefined
    };

    setFilters(resetFilters);
    setSearchParams({}); // Xóa sạch URL params
    appMessage.success("Đã đặt lại toàn bộ bộ lọc");
    setCurrentPage(1);
    fetchRooms(1, resetFilters);
  };

  const isVipRoom = (room) => {
    return Boolean(
      room.isPromoted ||
      Number(room.priorityLevel || 0) > 0 ||
      room.promotionPackageId ||
      room.promotionPackageName
    );
  };

  const renderListView = () => (
    <div className="flex flex-col gap-3">
      {rooms.map(room => {
        const isVip = isVipRoom(room);

        return (
          <Card
            key={room.id}
            hoverable
            className={`overflow-hidden border shadow-none hover:shadow-md transition-all rounded-md bg-white ${isVip ? 'border-orange-200 border-2 shadow-sm' : 'border-gray-200'
              }`}
            styles={{ padding: 0 }}
            onClick={() => navigate(`/rooms/${room.id}`)}
          >
            <div className="flex flex-col sm:flex-row h-full">
              {/* CỘT ẢNH */}
              <div className="w-full sm:w-[260px] h-[170px] relative flex-shrink-0">
                <img src={getImageUrl(room) || 'https://via.placeholder.com/300'} className="h-full w-full object-cover" alt="main" />


                {isVip && (
                  <Tag color="#fadb14" className="absolute top-2 left-2 border-none font-bold text-[10px] m-0 flex items-center gap-1 shadow-sm text-black px-1.5 py-0.5 z-10">
                    <CrownFilled /> VIP
                  </Tag>
                )}

                {room.priorityLevel >= 50 && (
                  <div className="absolute bottom-2 left-2 text-[#fadb14] animate-bounce drop-shadow-md z-10">
                    <FireFilled style={{ fontSize: '18px' }} />
                  </div>
                )}

                <div className="absolute bottom-1.5 right-1.5 text-white flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded text-[10px]">
                  <CameraFilled /> {room.images?.length || 0}
                </div>
              </div>

              {/* CỘT NỘI DUNG */}
              <div className="p-3 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className={`text-[15px] font-bold mb-1 line-clamp-2 transition-colors flex items-start gap-1 ${isVip ? 'text-[#f96302]' : 'text-gray-800'
                    }`}>
                    {isVip && <CrownFilled className="mt-1 flex-shrink-0" />} {room.title}
                  </h3>

                  <div className="text-xs text-gray-500 mb-1 line-clamp-1">{room.description || room.address}</div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-1">
                    <span className="text-[#d0021b] font-bold text-[16px]">{formatCurrency(room.price)}/tháng</span>
                    <span className="text-gray-500 text-sm whitespace-nowrap">{room.area} m²</span>
                    <span className="text-gray-500 text-sm whitespace-nowrap">{room.bedrooms} Phòng</span>
                    <span className="text-gray-500 text-sm whitespace-nowrap">{room.bathrooms} WC</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-1"><EnvironmentOutlined /> {room.address}</div>
                </div>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-gray-100">
                  <div className="flex items-center gap-2">
                    <Avatar size={20} src={room.landlordAvatar} icon={<UserOutlined />} />
                    <span className="text-xs text-gray-600 font-medium truncate max-w-[120px]">{room.landlordName || "Người đăng"}</span>
                    <span className="text-[10px] text-gray-400">• {room.time}</span>
                  </div>
                  <HeartOutlined className="text-gray-400 text-lg hover:text-red-500 cursor-pointer" />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );


  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map(room => {
        const isVip = isVipRoom(room);

        return (
          <Card
            key={room.id}
            hoverable
            className={`overflow-hidden border shadow-none hover:shadow-md transition-all rounded-md bg-white flex flex-col h-full ${isVip ? 'border-orange-200 border-2 shadow-sm' : 'border-gray-200'
              }`}
            styles={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}
            cover={
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={getImageUrl(room) || 'https://via.placeholder.com/300'}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                  alt="main"
                />

                {/* 🟢 TAG VIP */}
                {isVip && (
                  <Tag color="#fadb14" className="absolute top-2 right-2 border-none font-bold text-[10px] m-0 flex items-center gap-1 shadow-sm text-black px-1.5 py-0.5 z-10">
                    <CrownFilled /> VIP
                  </Tag>
                )}

                {/* 🟢 ICON LỬA */}
                {room.priorityLevel >= 50 && (
                  <div className="absolute bottom-2 left-2 text-[#fadb14] animate-bounce drop-shadow-md z-10">
                    <FireFilled style={{ fontSize: '18px' }} />
                  </div>
                )}

                <div className="absolute bottom-2 right-2 text-white flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded text-[10px]">
                  <CameraFilled /> {room.images?.length || 0}
                </div>
              </div>
            }
            onClick={() => navigate(`/rooms/${room.id}`)}
          >
            <div className="flex-grow">
              <h3 className={`text-[14px] font-bold mb-1 line-clamp-2 h-10 transition-colors flex items-start gap-1 ${isVip ? 'text-[#f96302]' : 'text-gray-800'
                }`} title={room.title}>
                {isVip && <CrownFilled className="mt-1 flex-shrink-0" />} {room.title}
              </h3>

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
                <span className="text-[#d0021b] font-bold text-[15px] whitespace-nowrap">{formatCurrency(room.price)}/tháng</span>
                <span className="text-gray-400 text-xs whitespace-nowrap">• {room.area} m²</span>
                <span className="text-gray-400 text-xs whitespace-nowrap">• {room.bedrooms} Phòng</span>
                <span className="text-gray-400 text-xs whitespace-nowrap">• {room.bathrooms} WC</span>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mb-2 truncate">
                <EnvironmentOutlined /> {room.address}
              </div>
            </div>
            <div className="flex justify-between items-center mt-auto pt-2 border-t border-dashed border-gray-100">
              <div className="flex items-center gap-2">
                <Avatar size={20} src={room.landlordAvatar} icon={<UserOutlined />} />
                <span className="text-xs text-gray-600 truncate max-w-[80px]">
                  {room.landlordName || "Người đăng"}
                </span>
              </div>
              <HeartOutlined className="text-gray-400 hover:text-red-500 cursor-pointer transition-colors" />
            </div>
          </Card>
        );
      })}
    </div>
  );

  // --- TÍNH SỐ LƯỢNG BỘ LỌC ĐANG ÁP DỤNG ---
  const activeFilterCount = (() => {
    let count = 0;
    if (filters.type !== 'ALL') count++;
    if (transactionType !== 'ALL') count++;
    if (priceRange[0] > 0 || priceRange[1] < 100000000) count++;
    if (areaRange.min || areaRange.max) count++;
    count += selectedBedrooms.length;
    count += selectedBathrooms.length;
    count += selectedFurniture.length;
    count += selectedAmenities.length;
    if (selectedProject) count++;
    return count;
  })();

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#f96302', borderRadius: 4, fontFamily: 'Arial, sans-serif' } }}>
      <div className="min-h-screen bg-[#f4f4f4] pb-10 font-sans">

        {/* HEADER FILTERS */}
        <div className="bg-white pt-4 pb-2 sticky top-0 z-50 shadow-sm">

          {/* ================================================================= */}
          {/* 2. ĐÃ THÊM THANH TÌM KIẾM VÀ NÚT BẢN ĐỒ Ở ĐÂY */}
          {/* ================================================================= */}
          <div className="max-w-7xl mx-auto px-4 mb-4">
            <div className="flex gap-2">
              <div className="flex-grow flex items-stretch shadow-sm rounded-lg overflow-hidden border border-gray-300 focus-within:border-[#f96302] focus-within:ring-1 focus-within:ring-orange-100 transition-all bg-white">
                <Input
                  placeholder="Tìm kiếm theo tên phòng, địa chỉ..."
                  variant="borderless"
                  className="flex-grow h-[46px] text-base"
                  value={filters.keyword}
                  onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                  onPressEnter={() => {
                    setCurrentPage(1);
                    fetchRooms(1);
                  }}
                  prefix={<SearchOutlined className="text-gray-400 mr-2" />}
                />
                <Button
                  type="primary"
                  className="h-full border-none rounded-none bg-[#f96302] hover:bg-[#e05a02] font-bold px-8 text-base transition-colors"
                  onClick={() => {
                    setCurrentPage(1);
                    fetchRooms(1);
                  }}
                >
                  Tìm kiếm
                </Button>
              </div>
              <Button
                size="large"
                type="default"
                icon={<AimOutlined />}
                onClick={() => {
                  if (!filters.locationCoords) {
                    const params = new URLSearchParams({
                      radius: filters.radius || 20000,
                      keyword: filters.keyword || '',
                      type: filters.type || 'ALL'
                    });

                    if (selectedProject) {
                      params.set('projectId', selectedProject);
                    }

                    navigate(`/search?${params.toString()}`);
                    return;
                  }


                  const params = new URLSearchParams({
                    lat: filters.locationCoords.lat,
                    lng: filters.locationCoords.lng,
                    radius: filters.radius || 20000,
                    keyword: filters.keyword || '',
                    type: filters.type || 'ALL'
                  });

                  if (selectedProject) {
                    params.set('projectId', selectedProject);
                  }

                  navigate(`/search?${params.toString()}`);
                }}
                className="flex items-center h-[48px] border-[#f96302] text-[#f96302] hover:bg-orange-50 font-medium px-6 rounded-lg"
              >
                Bản đồ
              </Button>
            </div>
          </div>
          {/* ================================================================= */}

          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-lg font-bold mb-3">
              {filters.locationName.startsWith('Gần')
                ? <span>Phòng trọ xung quanh <span className="text-[#f96302]">{filters.locationName.replace('Gần ', '')}</span></span>
                : `Kết quả tìm kiếm tại ${filters.locationName}`}
            </h1>

            <div className="flex flex-wrap gap-2 items-center mb-3">
              <Button
                onClick={() => setOpenFilterDrawer(true)}
                className={`border-none font-medium flex items-center gap-1 rounded-full px-4 transition-colors ${activeFilterCount > 0
                  ? 'bg-orange-50 text-[#f96302] border border-[#f96302]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <FilterOutlined /> Lọc {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>

              <Popover placement="bottomLeft" content={<LocationSelectContent onClose={() => setOpenLocation(false)} onApply={handleApplyLocation} />} trigger="click" open={openLocation} onOpenChange={setOpenLocation} arrow={false}>
                <Button className="bg-gray-100 border-none font-medium flex items-center gap-1 rounded-full px-4 hover:bg-gray-200">
                  <EnvironmentFilled className="text-[#f96302]" /> <span className="truncate max-w-[120px]">{filters.locationName}</span> <DownOutlined className="text-[10px]" />
                </Button>
              </Popover>

              {/* DRAWER LỌC NÂNG CAO */}
              <Drawer
                title="Lọc nâng cao"
                placement="right"
                onClose={() => setOpenFilterDrawer(false)}
                open={openFilterDrawer}
                size="default"
                footer={
                  <div className="flex gap-3">
                    <Button className="flex-1" onClick={handleResetAll}>Xóa lọc</Button>
                    <Button type="primary" className="flex-1 bg-[#f96302] border-none" onClick={() => {
                      setOpenFilterDrawer(false);
                      setCurrentPage(1);

                      const nextParams = new URLSearchParams(searchParams);
                      if (selectedProject) {
                        nextParams.set('projectId', selectedProject);
                      } else {
                        nextParams.delete('projectId');
                      }
                      setSearchParams(nextParams);

                      fetchRooms(1);
                    }}>Áp dụng</Button>
                  </div>
                }
              >
                {/* Loại giao dịch */}
                <div className="mb-6">
                  <h4 className="font-bold mb-3">Loại giao dịch</h4>
                  <Radio.Group className="w-full" onChange={(e) => setTransactionType(e.target.value)} value={transactionType}>
                    <div className="flex gap-4">
                      <Radio value="ALL">Tất cả</Radio>
                      <Radio value="FOR_RENT">Cho thuê</Radio>
                      <Radio value="FOR_SALE">Đăng bán</Radio>
                    </div>
                  </Radio.Group>
                </div>
                <Divider />

                {/* Loại phòng */}
                <div className="mb-6">
                  <h4 className="font-bold mb-3">Loại phòng</h4>
                  <Select
                    allowClear
                    placeholder="Chọn loại hình (Tất cả)"
                    className="w-full"
                    size="large"
                    value={filters.type === 'ALL' ? undefined : filters.type}
                    onChange={(val) => {
                      const newType = val || 'ALL';
                      setFilters({ ...filters, type: newType });
                      setSearchParams({ ...Object.fromEntries(searchParams), type: newType });
                    }}
                  >
                    <Option value="ROOM">Phòng trọ</Option>
                    <Option value="APARTMENT">Căn hộ</Option>
                    <Option value="HOUSE">Nhà nguyên căn</Option>
                    <Option value="VILLA">Biệt thự</Option>
                    <Option value="COMMERCIAL">Mặt bằng kinh doanh</Option>
                  </Select>
                </div>
                <Divider />

                {/* Dự án */}
                <div className="mb-6">
                  <h4 className="font-bold mb-3">Dự án / Khu trọ</h4>
                  <Select
                    showSearch
                    allowClear
                    placeholder="Chọn dự án..."
                    className="w-full"
                    size="large"
                    value={selectedProject}
                    onChange={(val) => {
                      setSelectedProject(val);

                      const nextParams = new URLSearchParams(searchParams);
                      if (val) {
                        nextParams.set('projectId', val);
                      } else {
                        nextParams.delete('projectId');
                      }

                      setSearchParams(nextParams);
                    }}
                    optionFilterProp="children"
                  >
                    {projectsList.map(p => (
                      <Option key={p.id} value={p.id}>{p.name}</Option>
                    ))}
                  </Select>
                </div>
                <Divider />

                {/* Giá thuê */}
                <div className="mb-6">
                  <h4 className="font-bold mb-3">Mức giá</h4>
                  <Slider range min={0} max={100000000} step={500000} value={priceRange} onChange={setPriceRange} trackStyle={{ backgroundColor: '#f96302' }} handleStyle={{ borderColor: '#f96302', backgroundColor: '#f96302' }} />
                  <div className="flex gap-2 mt-2">
                    <div className="border rounded px-2 py-1 flex-1 text-center bg-gray-50 text-xs">{formatCurrency(priceRange[0])}</div>
                    <div className="self-center">-</div>
                    <div className="border rounded px-2 py-1 flex-1 text-center bg-gray-50 text-xs">{formatCurrency(priceRange[1])}</div>
                  </div>
                </div>
                <Divider />

                {/* Diện tích */}
                <div className="mb-6">
                  <h4 className="font-bold mb-3">Diện tích (m²)</h4>
                  <div className="flex items-center gap-2">
                    <InputNumber className="w-full rounded-md py-1" placeholder="Từ" formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} onChange={(val) => setAreaRange({ ...areaRange, min: val })} value={areaRange.min} />
                    <span className="text-gray-400">-</span>
                    <InputNumber className="w-full rounded-md py-1" placeholder="Đến" formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} onChange={(val) => setAreaRange({ ...areaRange, max: val })} value={areaRange.max} />
                  </div>
                </div>
                <Divider />

                {/* Số phòng ngủ */}
                <div className="mb-6">
                  <h4 className="font-bold mb-3">Số phòng ngủ</h4>
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder="Chọn số phòng ngủ"
                    className="w-full"
                    size="large"
                    value={selectedBedrooms}
                    onChange={(val) => setSelectedBedrooms(val)}
                  >
                    {BEDROOM_OPTIONS.map(opt => (
                      <Option key={opt} value={opt}>{opt}</Option>
                    ))}
                  </Select>
                </div>
                <Divider />

                {/* Số phòng vệ sinh */}
                <div className="mb-6">
                  <h4 className="font-bold mb-3">Số phòng vệ sinh</h4>
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder="Chọn số phòng vệ sinh"
                    className="w-full"
                    size="large"
                    value={selectedBathrooms}
                    onChange={(val) => setSelectedBathrooms(val)}
                  >
                    {BATHROOM_OPTIONS.map(opt => (
                      <Option key={opt} value={opt}>{opt}</Option>
                    ))}
                  </Select>
                </div>
                <Divider />

                {/* Tiện ích (Amenities) */}
                <div className="mb-6">
                  <h4 className="font-bold mb-3">Tiện ích</h4>
                  <div className="flex flex-col gap-4">
                    {(() => {
                      const AMENITY_GROUPS = [
                        { title: "Cơ bản & Sinh hoạt", keywords: ['wifi', 'internet', 'điều hòa', 'máy lạnh', 'máy nước nóng', 'máy giặt', 'tủ lạnh', 'giường', 'nệm', 'tủ quần áo', 'bàn ghế'] },
                        { title: "Không gian", keywords: ['ban công', 'cửa sổ', 'gác lửng', 'nhà bếp', 'wc'] },
                        { title: "An ninh", keywords: ['bảo vệ', 'camera', 'giờ giấc', 'khóa', 'thẻ từ', 'chung chủ'] },
                        { title: "Tòa nhà & Khu vực", keywords: ['bãi', 'xe', 'hầm', 'thang máy', 'hồ bơi', 'gym', 'vui chơi', 'công viên', 'chợ', 'siêu thị'] },
                        { title: "Khác", keywords: [] }
                      ];

                      const groups = AMENITY_GROUPS.map(g => ({ ...g, items: [] }));
                      amenitiesList.forEach(item => {
                        const name = item.name.toLowerCase();
                        let matched = false;
                        for (let i = 0; i < groups.length - 1; i++) {
                          if (groups[i].keywords.some(kw => name.includes(kw))) {
                            groups[i].items.push(item);
                            matched = true;
                            break;
                          }
                        }
                        if (!matched) groups[groups.length - 1].items.push(item);
                      });

                      return groups.filter(g => g.items.length > 0).map((group, idx) => (
                        <div key={idx}>
                          <div className="text-xs text-gray-500 font-semibold mb-2">{group.title}</div>
                          <div className="flex flex-wrap gap-2">
                            {group.items.map(opt => (
                              <Tag.CheckableTag
                                key={opt.id || opt.name}
                                checked={selectedAmenities.includes(opt.name)}
                                onChange={(checked) => {
                                  const val = opt.name;
                                  if (checked) setSelectedAmenities([...selectedAmenities, val]);
                                  else setSelectedAmenities(selectedAmenities.filter(item => item !== val));
                                }}
                                className={`border px-3 py-1 text-sm rounded-full ${selectedAmenities.includes(opt.name) ? 'border-[#f96302] bg-orange-50 text-[#f96302]' : 'border-gray-200'}`}
                              >
                                {opt.name}
                              </Tag.CheckableTag>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                <Divider />


                {/* Tình trạng nội thất */}
                <div className="mb-6">
                  <h4 className="font-bold mb-3">Tình trạng nội thất</h4>
                  <div className="flex flex-wrap gap-2">
                    {FURNITURE_OPTIONS.map(opt => (
                      <Tag.CheckableTag
                        key={opt.value}
                        checked={selectedFurniture.includes(opt.value)}
                        onChange={(checked) => {
                          if (checked) setSelectedFurniture([...selectedFurniture, opt.value]);
                          else setSelectedFurniture(selectedFurniture.filter(item => item !== opt.value));
                        }}
                        className={`border px-3 py-1 text-sm rounded-full ${selectedFurniture.includes(opt.value) ? 'border-[#f96302] bg-orange-50 text-[#f96302]' : 'border-gray-200'}`}
                      >
                        {opt.label}
                      </Tag.CheckableTag>
                    ))}
                  </div>
                </div>
              </Drawer>

              <Popover
                placement="bottomLeft"
                content={<NearbyAmenitiesContent onClose={() => setOpenAmenities(false)} onApply={handleApplyAmenities} />}
                trigger="click"
                open={openAmenities}
                onOpenChange={setOpenAmenities}
                arrow={false}
              >
                <Button className="bg-blue-50 text-blue-600 border-blue-200 font-medium flex items-center gap-1 rounded-full px-4 hover:bg-blue-100">
                  <EnvironmentOutlined /> <span>Tiện ích quanh đây</span> <DownOutlined className="text-[10px]" />
                </Button>
              </Popover>

              <div className="flex-grow"></div>
              {/* NÚT XÓA LỌC ĐÃ CẬP NHẬT */}
              <Button type="text" danger onClick={handleResetAll}>Xoá lọc</Button>
            </div>

          </div>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <Row gutter={24}>
            {/* Cột Trái: Danh sách tin */}
            <Col xs={24} md={24}>
              <div className="flex flex-wrap justify-between items-center border-b border-gray-200 mb-4 pb-2 gap-3">
                <div className="flex flex-wrap gap-4 sm:gap-6 text-sm font-bold">
                  <span onClick={() => setActiveTab('ALL')} className={`${activeTab === 'ALL' ? 'border-b-2 border-[#f96302] text-[#f96302]' : 'text-gray-500 hover:text-black font-normal'} pb-1 cursor-pointer whitespace-nowrap`}>Tất cả</span>
                  <span onClick={() => { setActiveTab('INDIVIDUAL'); message.info('Tính năng lọc theo Cá nhân sắp ra mắt!'); }} className={`${activeTab === 'INDIVIDUAL' ? 'border-b-2 border-[#f96302] text-[#f96302]' : 'text-gray-500 hover:text-black font-normal'} pb-1 cursor-pointer whitespace-nowrap`}>Cá nhân</span>
                  <span onClick={() => { setActiveTab('BROKER'); message.info('Tính năng lọc theo Môi giới sắp ra mắt!'); }} className={`${activeTab === 'BROKER' ? 'border-b-2 border-[#f96302] text-[#f96302]' : 'text-gray-500 hover:text-black font-normal'} pb-1 cursor-pointer whitespace-nowrap`}>Môi giới</span>
                </div>
                <div className="flex items-center justify-between w-full md:w-auto gap-2 text-sm text-gray-600 md:ml-auto mt-1 md:mt-0">
                  <Select
                    variant="borderless"
                    value={sortOrder}
                    onChange={(val) => setSortOrder(val)}
                    options={[
                      { label: 'Tin mới nhất', value: 'newest' },
                      { label: 'Giá từ thấp đến cao', value: 'price_asc' },
                      { label: 'Giá từ cao đến thấp', value: 'price_desc' }
                    ]}
                    className="text-gray-600 min-w-[150px] !p-0 font-medium"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-[1px] h-4 bg-gray-300 mx-1 hidden sm:block"></div>
                    <div className="flex bg-gray-100 rounded p-0.5">
                      <Button type="text" size="small" icon={<UnorderedListOutlined />} className={viewMode === 'list' ? "bg-white shadow-sm text-[#f96302]" : "text-gray-400"} onClick={() => setViewMode('list')} />
                      <Button type="text" size="small" icon={<AppstoreOutlined />} className={viewMode === 'grid' ? "bg-white shadow-sm text-[#f96302]" : "text-gray-400"} onClick={() => setViewMode('grid')} />
                    </div>
                  </div>
                </div>
              </div>

              {/* LIST DỮ LIỆU */}
              {loading ? <div className="text-center py-20"><Spin size="large" /></div> : (
                rooms.length === 0 ? <Empty description="Không có tin đăng nào phù hợp" className="py-10 bg-white rounded" /> :
                  (
                    <>

                      {viewMode === 'list' ? renderListView(rooms) : renderGridView(rooms)}

                      {/* --- THANH PHÂN TRANG --- */}
                      <div className="flex justify-center mt-6">

                        <Pagination
                          current={currentPage}
                          total={totalElements}
                          pageSize={pageSize}
                          onChange={(page) => {
                            setCurrentPage(page);
                            fetchRooms(page);
                          }}
                        />
                      </div>
                    </>
                  )
              )}
            </Col>
          </Row>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default FilterPage;