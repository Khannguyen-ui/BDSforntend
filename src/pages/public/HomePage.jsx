import React, { useEffect, useState, useRef } from 'react';
import {
  Input, Button, Card, Row, Col, Tag, Spin, Empty, Select, message,
  ConfigProvider, Popover, Typography, Skeleton
} from 'antd';
import {
  SearchOutlined, EnvironmentFilled, CheckOutlined,
  DownOutlined, HeartOutlined, RightOutlined,
  HistoryOutlined,
  CloseOutlined, CrownFilled, FireFilled, PlayCircleFilled
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import roomService from '../../services/roomService';
import recommendService from '../../services/recommendService';
import useAuth from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/format';
import searchHistoryService from '../../services/searchHistoryService';
import axiosClient from '../../config/axiosClient';
import ReelsViewer from '../../components/modals/ReelsViewer';
import ProvinceImage from '../../components/common/ProvinceImage';
import interactionService from '../../services/interactionService';
import Footer from '../../components/layout/Footer';

const { Option } = Select;
const { Title } = Typography;




const normalizeTopRegions = (res) => {
  const raw =
    res?.data?.result ||
    res?.data?.data ||
    res?.data ||
    [];

  const list = Array.isArray(raw) ? raw : [];

  return list
    .map((item, index) => {
      const name =
        item.regionName ||
        item.key ||
        item.region ||
        item.name ||
        item.province ||
        'Khu vực khác';

      const count =
        item.totalPosts ??
        item.count ??
        item.total ??
        item.value ??
        item.forRentCount ??
        0;

      return {
        id: name,
        name,
        count,
        colSpan: index === 0 ? 2 : 1,
        rowSpan: index === 0 ? 2 : 1
      };
    })
    .filter(item => item.name && item.name !== 'Không xác định');
};
const normalizeArrayData = (res) => {
  const raw =
    res?.data?.result?.content ||
    res?.data?.content ||
    res?.data?.data?.content ||
    res?.data?.result ||
    res?.data?.data ||
    res?.data ||
    [];

  return Array.isArray(raw) ? raw : [];
};



// --- POPOVER LOẠI HÌNH ---
const TypeSelectContent = ({ currentType, onClose, onApply }) => {
  const options = [
    { label: 'Tất cả phòng trọ', value: 'ALL' },
    { label: 'Thuê nguyên căn', value: 'HOUSE' },
  
  ];
  return (
    <div className="w-[200px] p-1">
      <div className="flex flex-col gap-2">
        {options.map(opt => (
          <div key={opt.value} className="flex justify-between cursor-pointer p-2 hover:bg-gray-50 rounded" onClick={() => { onApply(opt.value); onClose(); }}>
            <span className={currentType === opt.value ? "font-bold text-[#f96302]" : "text-gray-600"}>{opt.label}</span>
            {currentType === opt.value && <CheckOutlined className="text-[#f96302]" />}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- TRANG CHỦ CHÍNH ---
const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State Reels
  const [isReelsOpen, setIsReelsOpen] = useState(false);
  const [initialReelRoomId, setInitialReelRoomId] = useState(null);

  // State Dữ liệu chính
  const [rooms, setRooms] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const pageSize = 8;
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // State Tin Mới Đăng
  const [newListings, setNewListings] = useState([]);
  const [loadingNew, setLoadingNew] = useState(true);

  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);



  const [locationStats, setLocationStats] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);


  // State Popover
  const [openLocation, setOpenLocation] = useState(false);
  const [openType, setOpenType] = useState(false);

  const [filters, setFilters] = useState({ keyword: '', type: 'ALL', locationName: 'Toàn quốc', locationCoords: null, radius: undefined });
  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const fetchRoomsWithParams = async (newParams) => {
    setLoading(true);
    setPage(0);
    setRooms([]);

    try {
      const res = await roomService.searchRooms({
        lat: newParams.locationCoords.lat,
        lng: newParams.locationCoords.lng,
        radius: newParams.radius || 15000,
        keyword: newParams.keyword || '',
        type: newParams.type || 'ALL',
        page: 0,
        size: 8
      });

      setRooms(res.data.content || []);
      setHasMore(res.data.content?.length === 8);
    } catch (error) {
      console.error("Lỗi tải tin:", error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };
  const fetchFeaturedRegions = async () => {
    setLocationLoading(true);

    try {
      const res = await roomService.getTopRegionsTransactionStats(5, 'province.keyword');
      setLocationStats(normalizeTopRegions(res));
    } catch (error) {
      console.error('Lỗi tải khu vực nổi bật:', error);
      setLocationStats([]);
    } finally {
      setLocationLoading(false);
    }
  };
  useEffect(() => {
    fetchFeaturedRegions();
  }, []);


  const [historyList, setHistoryList] = useState([]);
  const [showHistory, setShowHistory] = useState(false);;


  const [topSearches, setTopSearches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    fetchRooms();
    fetchNewListings();
    fetchFeaturedProjects();
    fetchHistory();
    fetchTopSearches();
  }, []);

  const fetchTopSearches = async () => {
    try {
      const res = await recommendService.getTopSearches();
      setTopSearches(res.data?.result || res.data || []);
    } catch (e) {
      console.log("Lỗi tải top tìm kiếm:", e);
    }
  };


  // Tự động gọi API gợi ý khi gõ
  useEffect(() => {
    if (filters.keyword && filters.keyword.trim().length >= 1) {
      const timer = setTimeout(async () => {
        try {
          const res = await recommendService.getSearchSuggestions(filters.keyword);
          // API có thể trả về res.data.suggestions hoặc mảng trực tiếp
          const data = res.data?.suggestions || res.data || [];
          setSuggestions(Array.isArray(data) ? data : []);
        } catch (e) {
          console.log("Lỗi tải gợi ý:", e);
        }
      }, 300); // Debounce 300ms
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
    }
  }, [filters.keyword]);

  const fetchHistory = async () => {
    try {
      // 🟢 SỬA TẠI ĐÂY: Đổi 'token' thành 'accessToken'
      const userSessionId = sessionStorage.getItem('userSessionId');
      const token = userSessionId ? sessionStorage.getItem(`${userSessionId}_accessToken`) : null;

      if (token) {
        const res = await searchHistoryService.getMyHistory();
        const historyData = res.data?.result || res.data?.data || res.data;
        setHistoryList(Array.isArray(historyData) ? historyData : []);
      }
    } catch (error) {
      console.log("Lỗi tải lịch sử:", error);
    }
  };
  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation(); // Ngăn click vào item cha
    try {
      await searchHistoryService.deleteHistory(id);
      setHistoryList(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      messageApi.error("Lỗi xóa lịch sử");
    }
  };
  const handleSelectHistory = (item) => {
    // Tạo state từ dữ liệu lịch sử
    const searchParams = {
      keyword: item.queryText, // Từ khóa cũ
      type: 'ALL',
      locationName: item.queryText, // Hoặc lấy address nếu DB có lưu
      locationCoords: {
        lat: item.latitude || 10.7769, // Fallback nếu lịch sử cũ ko có tọa độ
        lng: item.longitude || 106.7009
      },
      radius: item.radius || 20000
    };

    setShowHistory(false);

    // 👇 Chuyển hướng ngay lập tức
    navigate('/filter', { state: searchParams });
  };
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Bán kính trái đất (mét)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // --- API 1: TÌM KIẾM CHÍNH (CẬP NHẬT NGẮT Ở 12 TIN) ---

  const fetchRooms = async (isLoadMore = false, overrideFilters = null) => {
    setLoading(true);
    if (!isLoadMore) { setRooms([]); setPage(0); }

    const nextPage = isLoadMore ? page + 1 : 0;
    const currentParams = overrideFilters || filters;

    try {
      const isNationwide = currentParams.locationName === 'Toàn quốc';

      // Sử dụng Recommend Service thay vì Search Service
      let guestId = localStorage.getItem('guestId');
      if (!guestId || isNaN(guestId) || String(guestId).startsWith('guest_')) {
        guestId = Date.now().toString();
        localStorage.setItem('guestId', guestId);
      }

      let finalUserId = user?.id;
      if (!finalUserId) {
        const userSessionId = sessionStorage.getItem('userSessionId');
        if (userSessionId) {
          finalUserId = sessionStorage.getItem(`${userSessionId}_userId`);
        }
      }
      finalUserId = finalUserId || guestId;

      // Gọi Recommend API (Truyền thêm type nếu backend có hỗ trợ filter)
      let res;
      try {
        res = await recommendService.getFinalPropertiesFeed(
          finalUserId,
          nextPage,
          8,
          currentParams.type
        );
      } catch (err) {
        console.warn("Lỗi Recommend API, tự động fallback sang Search API:", err);
        res = await roomService.searchRooms({
          ...currentParams,
          page: nextPage,
          size: 8
        });
      }

      let newData = res.data?.content || res.data?.items || res.data || [];

      // Lọc bỏ tin đã ẩn hoặc hết hạn bằng cách đối chiếu với danh sách tin ACTIVE
      try {
        const publicRes = await axiosClient.get('/public/properties', { params: { size: 1000, status: 'ACTIVE' } });
        const publicData = publicRes.data?.result?.content || publicRes.data?.data?.content || publicRes.data?.content || (Array.isArray(publicRes.data?.result) ? publicRes.data.result : []);
        const activeIds = new Set(publicData.map(p => p.id));

        newData = newData.filter(item => activeIds.has(item.id));
      } catch (err) {
        // Fallback filter
        newData = newData.filter(item => {
          if (item.status === 'EXPIRED' || item.status === 'HIDDEN') return false;
          if (item.expiresAt && new Date(item.expiresAt) < new Date()) return false;
          return true;
        });
      }

      // 🟢 XỬ LÝ LỖI BACKEND TRẢ VỀ QUÁ NHIỀU TIN (Client-side Pagination)
      // Nếu backend không phân trang (trả về mảng trực tiếp dài hơn size yêu cầu), ta tự cắt
      if (Array.isArray(res.data) && newData.length > 8) {
        const start = nextPage * 8;
        const end = start + 8;
        newData = newData.slice(start, end);
      }

      // 🟢 BỔ SUNG LOGIC SẮP XẾP CLIENT-SIDE (Đồng bộ với Tin Mới)
      const sortedData = [...newData].sort((a, b) => {
        const priorityA = a.priorityLevel || (a.isPromoted ? 100 : 0);
        const priorityB = b.priorityLevel || (b.isPromoted ? 100 : 0);

        // Ưu tiên 1: VIP (Priority Level)
        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }
        // Ưu tiên 2: Tin mới đẩy/mới tạo
        const dateA = new Date(a.lastPushedAt || a.promotionExpiresAt || a.createdAt);
        const dateB = new Date(b.lastPushedAt || b.promotionExpiresAt || b.createdAt);
        return dateB - dateA;
      });

      setRooms(prev => isLoadMore ? [...prev, ...sortedData] : sortedData);
      setPage(nextPage);
      setHasMore(newData.length === 8);
    } catch (error) {
      console.error("Lỗi fetchRooms:", error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };
  // Tự động load lại tin khi có bất kỳ thay đổi nào từ bộ lọc chính
  useEffect(() => {
    if (!isInitialLoad) {
      fetchRooms();
      fetchNewListings();
    }
  }, [filters.locationCoords, filters.type]);
  const fetchFeaturedProjects = async () => {
    setLoadingProjects(true);

    try {
      const res = await roomService.getPublicProjects(0, 8);
      setFeaturedProjects(normalizeArrayData(res));
    } catch (error) {
      console.error('Lỗi tải dự án nổi bật:', error);
      setFeaturedProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };
  const fetchNewListings = async () => {
    setLoadingNew(true);
    try {
      const res = await axiosClient.get('/public/properties', {
        params: { page: 0, size: 50, status: 'ACTIVE' }
      });

      const rawData = res.data?.result || res.data?.data || res.data;
      let allRooms = rawData?.content || rawData || [];

      // Lọc bỏ tin đã ẩn hoặc hết hạn
      allRooms = allRooms.filter(item => {
        if (item.status === 'EXPIRED' || item.status === 'HIDDEN') return false;
        if (item.expiresAt && new Date(item.expiresAt) < new Date()) return false;
        return true;
      });

      // Sắp xếp: VIP/Promoted trước → mới nhất sau
      const sortedList = [...allRooms].sort((a, b) => {
        const priorityA = a.priorityLevel || (a.isPromoted ? 100 : 0);
        const priorityB = b.priorityLevel || (b.isPromoted ? 100 : 0);
        if (priorityA !== priorityB) return priorityB - priorityA;
        const dateA = new Date(a.lastPushedAt || a.promotionExpiresAt || a.createdAt);
        const dateB = new Date(b.lastPushedAt || b.promotionExpiresAt || b.createdAt);
        return dateB - dateA;
      });

      setNewListings(sortedList.slice(0, 10));
    } catch (error) {
      console.error("Lỗi fetch tin mới:", error);
    } finally {
      setLoadingNew(false);
    }
  };



  const handleApplyLocation = async (locData) => {
    if (!locData.fullText) return;
    const hide = messageApi.loading(`Đang cập nhật tin tại ${locData.displayName}...`, 0);
    try {
      const geocode = async (q) => (await axios.get(`https://nominatim.openstreetmap.org/search`, { params: { q, format: 'json', limit: 1, countrycodes: 'vn' } })).data?.[0];
      let result = await geocode(locData.fullText);

      if (result) {
        const newCoords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
        const newFilters = {
          ...filters,
          locationName: locData.displayName,
          locationCoords: newCoords,
          radius: 20000
        };

        setFilters(newFilters); // Cập nhật tên hiển thị trên thanh Search


        fetchRooms(false, newFilters);
        fetchNewListings(newFilters);

        hide();
        messageApi.success(`Đã hiển thị tin tại: ${locData.displayName}`);
      }
    } catch (e) { hide(); messageApi.error('Lỗi kết nối bản đồ'); }
  };
  const fetchRoomsByParams = async (params) => {
    setLoading(true);
    setPage(0); // Reset về trang đầu tiên
    try {
      const res = await roomService.searchRooms({
        lat: params.locationCoords.lat,
        lng: params.locationCoords.lng,
        radius: params.radius || 15000,
        type: params.type || 'ALL',
        keyword: params.keyword || '',
        page: 0,
        size: 8
      });

      // Cập nhật danh sách "Tin dành cho bạn"
      setRooms(res.data.content || []);
      setHasMore(res.data.content?.length === 8);
    } catch (error) {
      console.error("Lỗi tải lại tin:", error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };
  // --- XỬ LÝ TÌM KIẾM & CHUYỂN TRANG ---
  const handleSearchNavigate = async () => {
    // 1. Chuẩn bị bộ lọc mặc định từ state hiện tại
    let searchState = {
      keyword: filters.keyword || '',
      type: filters.type || 'ALL',
      locationName: filters.locationName,
      locationCoords: filters.locationCoords,
      radius: filters.radius || 20000 // Mặc định 20km
    };

    // 2. Nếu không có từ khóa -> Chuyển trang ngay với bộ lọc hiện tại
    if (!filters.keyword || !filters.keyword.trim()) {
      navigate('/filter', { state: searchState });
      return;
    }

    // 3. 🟢 GỌI API TRACKING TÌM KIẾM CỦA AI
    recommendService.trackSearch({
      keyword: searchState.keyword,
      district: searchState.locationName !== 'Toàn quốc' ? searchState.locationName : '',
      minPrice: 0,
      maxPrice: 0
    }).catch(e => console.log("Lỗi ghi nhận hành vi tìm kiếm:", e));

    // 4. CHUYỂN HƯỚNG SANG TRANG FILTER (Bỏ qua API Map vì gây sai lệch từ khóa)
    navigate('/filter', { state: searchState });
  };;

  const PLACEHOLDER = 'https://placehold.co/400x300/f0f0f0/999999?text=No+Image';

  const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    if (url.startsWith('file://') || url.startsWith('/data/') || url.startsWith('content://')) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  };

  const getImageUrl = (item) => {
    if (!item) return PLACEHOLDER;
    if (item.thumbnail && isValidImageUrl(item.thumbnail)) return item.thumbnail;

    // Dự phòng trường hợp backend Recommend trả về key khác
    if (item.image && isValidImageUrl(item.image)) return item.image;
    if (item.imageUrl && isValidImageUrl(item.imageUrl)) return item.imageUrl;

    if (Array.isArray(item.images) && item.images.length > 0) {
      const validImg = item.images.find(isValidImageUrl);
      return validImg || PLACEHOLDER;
    }

    if (typeof item.images === 'string') {
      try {
        const parsed = JSON.parse(item.images);
        if (Array.isArray(parsed)) {
          const validImg = parsed.find(isValidImageUrl);
          return validImg || PLACEHOLDER;
        }
      } catch (e) {
        if (isValidImageUrl(item.images)) return item.images;
      }
    }

    return PLACEHOLDER;
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#f96302', borderRadius: 8 }, components: { Button: { colorPrimary: '#f96302', colorPrimaryHover: '#d85502' } } }}>
      {/* Đóng lịch sử khi click ra ngoài */}
      <div className="min-h-screen bg-[#f4f4f4] pb-20 font-sans relative" onClick={() => setShowHistory(false)}>

        {/* HEADER SEARCH */}

        <div className="bg-[#f96302] py-4 sticky top-0 z-50 shadow-md">
          <div className="max-w-6xl mx-auto px-4">
            {/* Thêm class 'relative' để dropdown bám theo div này */}
            <div className="bg-white p-1.5 rounded-lg flex items-center gap-2 relative">

              {/* INPUT TÌM KIẾM */}
              <Input
                prefix={<SearchOutlined className="text-gray-400 text-base md:text-lg mr-1 md:mr-2" />}
                placeholder="Tìm phòng trọ, căn hộ..."
                variant="borderless"
                className="flex-grow text-sm md:text-base px-1 md:px-2"
                value={filters.keyword}
                onChange={e => setFilters(prev => ({ ...prev, keyword: e.target.value }))}

                // Khi nhấn Enter -> Tìm kiếm
                onPressEnter={handleSearchNavigate}

                // Khi focus hoặc click vào ô input -> Mở lịch sử
                onFocus={(e) => { e.stopPropagation(); setShowHistory(true); }}
                onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
              />


              {/* --- PHẦN DROPDOWN GỢI Ý & LỊCH SỬ --- */}
              {showHistory && (historyList.length > 0 || topSearches.length > 0 || suggestions.length > 0) && (
                <div
                  className="absolute top-[105%] left-0 w-full bg-white rounded-xl shadow-xl z-[100] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {filters.keyword.trim().length > 0 ? (
                    // 🟢 HIỂN THỊ GỢI Ý KHI ĐANG GÕ
                    <>
                      <div className="px-4 py-2.5 border-b border-gray-50 bg-gray-50/50">
                        <span className="text-sm font-semibold text-gray-600">Gợi ý tìm kiếm</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {suggestions.length > 0 ? suggestions.map((item, idx) => (
                          <div
                            key={idx}
                            className="px-4 py-2 hover:bg-orange-50 cursor-pointer flex items-center gap-3 transition-all border-b border-gray-50 last:border-none group"
                            onClick={() => {
                              // Cập nhật text nhưng đợi 1 chút để chuyển trang
                              setFilters(prev => ({ ...prev, keyword: item }));
                              setShowHistory(false);
                              // Chuyển hướng trực tiếp với từ khóa gợi ý
                              navigate('/filter', {
                                state: { ...filters, keyword: item }
                              });
                            }}
                          >
                            <SearchOutlined className="text-gray-400 group-hover:text-[#f96302]" />
                            <span className="text-sm text-gray-700 font-medium group-hover:text-[#f96302] truncate">
                              {item}
                            </span>
                          </div>
                        )) : (
                          <div className="px-4 py-3 text-sm text-gray-400 text-center">Không có gợi ý nào</div>
                        )}
                      </div>
                    </>
                  ) : (
                    // 🟢 HIỂN THỊ TOP TÌM KIẾM & LỊCH SỬ KHI Ô TRỐNG
                    <div className="flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar">

                      {/* Top Tìm Kiếm */}
                      {topSearches.length > 0 && (
                        <div className="mb-2 mt-2">
                          <div className="px-4 py-1.5 flex items-center gap-2">
                            <FireFilled className="text-[#f96302]" />
                            <span className="text-sm font-semibold text-gray-800">Top tìm kiếm nổi bật</span>
                          </div>
                          <div className="px-4 py-2 flex flex-wrap gap-2">
                            {topSearches.map((item, idx) => (
                              <Tag
                                key={idx}
                                className="cursor-pointer px-3 py-1.5 m-0 bg-orange-50/50 border-orange-100 hover:bg-[#f96302] hover:text-white text-gray-700 transition-all rounded-full text-xs font-medium"
                                onClick={() => {
                                  setFilters(prev => ({ ...prev, keyword: item }));
                                  setShowHistory(false);
                                  navigate('/filter', {
                                    state: { ...filters, keyword: item }
                                  });
                                }}
                              >
                                {item}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lịch sử tìm kiếm */}
                      {historyList.length > 0 && (
                        <div>
                          <div className="px-4 py-2.5 border-y border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <span className="text-sm font-semibold text-gray-600">Lịch sử tìm kiếm</span>
                            <Button
                              type="text"
                              size="small"
                              className="text-gray-400 hover:text-red-500 text-[11px]"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await searchHistoryService.clearAllHistory();
                                setHistoryList([]);
                              }}
                            >
                              Xóa tất cả
                            </Button>
                          </div>
                          <div>
                            {historyList.map(item => (
                              <div
                                key={item.id}
                                className="px-4 py-2 hover:bg-orange-50 cursor-pointer flex justify-between items-center group transition-all border-b border-gray-50 last:border-none"
                                onClick={() => handleSelectHistory(item)}
                              >
                                <div className="flex items-center gap-3 flex-grow overflow-hidden">
                                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <HistoryOutlined className="text-gray-500 text-sm group-hover:text-[#f96302]" />
                                  </div>
                                  <div className="flex flex-col truncate">
                                    <span className="text-sm text-gray-700 font-medium group-hover:text-[#f96302] truncate">
                                      {item.queryText || item.address || "Tìm kiếm trước đó"}
                                    </span>
                                    {item.address && item.address !== item.queryText && (
                                      <span className="text-[11px] text-gray-400 truncate opacity-80">
                                        {item.address}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <RightOutlined className="text-gray-300 text-[10px] group-hover:text-[#f96302] group-hover:translate-x-0.5 transition-all" />
                                  <Button
                                    type="text"
                                    icon={<CloseOutlined className="text-[9px]" />}
                                    size="small"
                                    className="text-gray-300 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteHistory(e, item.id);
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* --- KẾT THÚC PHẦN LỊCH SỬ --- */}

              <div className="hidden md:block w-[1px] h-6 bg-gray-200 mx-1"></div>



              <Popover
                content={
                  <TypeSelectContent
                    currentType={filters.type}
                    onClose={() => setOpenType(false)}
                    onApply={(val) => {
                      const newFilters = { ...filters, type: val };
                      setFilters(newFilters);
                      fetchRooms(false, newFilters);
                    }}
                  />
                }
                trigger="click"
                open={openType}
                onOpenChange={setOpenType}
                placement="bottom"
                arrow={false}
              >

              </Popover>

              <Button
                type="primary"
                size="large"
                className="px-4 sm:px-8 font-bold h-10 bg-[#f96302] text-white border-none hover:bg-[#d85502] transition-all whitespace-nowrap text-xs sm:text-sm md:text-base flex-shrink-0"
                onClick={handleSearchNavigate}
              >
                TÌM NGAY
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 mt-6 space-y-8">

          {/* SECTION 1: TIN MỚI */}
          <div className="bg-white p-5 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <Title level={4} style={{ margin: 0 }}>Tin cho thuê mới đăng</Title>
              <Button type="link" className="text-gray-500 hover:text-[#f96302]">
                Xem tất cả <RightOutlined />
              </Button>
            </div>

            {loadingNew ? (
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4].map(i => <Skeleton.Image key={i} active style={{ width: 220, height: 160 }} />)}
              </div>
            ) : newListings.length === 0 ? (
              <Empty description="Chưa có tin đăng nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {newListings.map((item) => {
                  // Kiểm tra xem tin có phải là VIP hay không
                  const isVip = (item.priorityLevel && item.priorityLevel > 0) || item.isPromoted;

                  return (
                    <div
                      key={item.id}
                      className="min-w-[220px] max-w-[220px] group cursor-pointer"
                      onClick={() => navigate(`/rooms/${item.id}`)}
                    >
                      <div className="relative h-[160px] rounded-lg overflow-hidden mb-2">
                        <img
                          src={getImageUrl(item)}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          alt="room"
                        />


                        {isVip && (
                          <Tag color="#fadb14" className="absolute top-2 left-2 border-none font-bold text-[10px] m-0 flex items-center gap-1 shadow-sm text-black px-1.5 py-0.5 z-10">
                            <CrownFilled /> VIP
                          </Tag>
                        )}

                        {/* --- 2. NHÃN TRẠNG THÁI MẶC ĐỊNH --- */}
                        <div className="absolute bottom-2 right-2 text-[10px] text-white font-medium drop-shadow-md bg-black/40 px-2 py-0.5 rounded">
                          Mới đăng
                        </div>

                        {/* --- 3. ICON REELS NẾU CÓ VIDEO --- */}
                        {item.videoUrl && (
                          <div
                            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInitialReelRoomId(item.id);
                              setIsReelsOpen(true);
                            }}
                          >
                            <PlayCircleFilled className="text-white text-5xl drop-shadow-lg hover:scale-110 transition-transform" />
                          </div>
                        )}
                      </div>

                      {/* --- 3. TIÊU ĐỀ: Tự động đổi màu và in đậm nếu là tin VIP --- */}
                      <h3 className={`font-medium text-sm line-clamp-2 mb-1 transition-colors ${isVip ? 'text-[#f96302] font-bold' : 'text-gray-800 group-hover:text-[#f96302]'}`}>
                        {item.title}
                      </h3>

                      <div className="text-red-600 font-bold text-base mb-1">
                        {formatCurrency(item.price)}/tháng
                      </div>

                      <div className="text-xs text-gray-400 flex items-center truncate">
                        <EnvironmentFilled className="mr-1 text-gray-300" /> {item.address}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>


          {/* SECTION 2: KHU VỰC NỔI BẬT */}
          <div className="bg-white p-5 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-2">
              <div className="flex items-center gap-4">
                <Title level={4} style={{ margin: 0 }}>Khu vực cho thuê nổi bật</Title>
              </div>
              <span className="text-sm text-gray-500">
                Dựa trên thống kê tin đang hoạt động
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-auto md:h-[350px]">
              {locationLoading ? (
                <div className="col-span-4 flex items-center justify-center h-[250px]">
                  <Spin />
                </div>
              ) : locationStats.length === 0 ? (
                <div className="col-span-4">
                  <Empty description="Chưa có dữ liệu khu vực nổi bật" />
                </div>
              ) : (
                locationStats.map((loc) => (
                  <div
                    key={loc.id}
                    className={`relative rounded-lg overflow-hidden cursor-pointer group ${loc.colSpan === 2
                      ? 'md:col-span-2 md:row-span-2'
                      : 'md:col-span-1 md:row-span-1'
                      } h-[160px] md:h-auto`}
                    onClick={() => {
                      navigate('/filter', {
                        state: {
                          locationName: loc.name,
                          province: loc.name,
                          type: 'ALL',
                          keyword: ''
                        }
                      });
                    }}
                  >
                    <ProvinceImage
                      provinceName={loc.name}
                      alt={loc.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                    <div className="absolute bottom-4 left-4 text-white z-10">
                      <h3 className="text-lg md:text-xl font-bold mb-0 text-white drop-shadow-md">
                        {loc.name}
                      </h3>

                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        <span className="text-xs md:text-sm font-medium opacity-90">
                          {(loc.count || 0).toLocaleString()} tin đăng
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* SECTION 3: DỰ ÁN / KHU TRỌ NỔI BẬT */}
          {(loadingProjects || featuredProjects.length > 0) && (
            <div className="bg-white p-5 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <Title level={4} style={{ margin: 0 }}>
                  Dự án / Khu trọ nổi bật
                </Title>

                <Button
                  type="link"
                  className="text-gray-500 hover:text-[#f96302]"
                  onClick={() => navigate('/filter')}
                >
                  Xem thêm <RightOutlined />
                </Button>
              </div>

              {loadingProjects ? (
                <Row gutter={[16, 16]}>
                  {[1, 2, 3, 4].map(i => (
                    <Col xs={24} sm={12} md={6} key={i}>
                      <Skeleton active />
                    </Col>
                  ))}
                </Row>
              ) : (
                <Row gutter={[16, 16]}>
                  {featuredProjects.map(project => (
                    <Col xs={24} sm={12} md={6} key={project.id}>
                      <Card
                        hoverable
                        className="rounded-xl overflow-hidden h-full border border-gray-100 hover:shadow-md transition-all group"
                        onClick={() => navigate(`/projects/${project.id}`)}
                        cover={
                          <div className="relative h-40 overflow-hidden">
                            {project.imageUrl ? (
                              <img
                                src={project.imageUrl}
                                alt={project.name || project.title || 'Dự án'}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                              />
                            ) : (
                              <ProvinceImage
                                provinceName={project.province || project.address || 'Khu vực khác'}
                                alt={project.name || project.title || 'Dự án'}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                            <Tag
                              color="#f96302"
                              className="absolute top-3 left-3 border-none font-semibold text-xs"
                            >
                              Dự án
                            </Tag>

                            {project.totalProperties !== undefined && (
                              <div className="absolute bottom-3 left-3 text-white">
                                <div className="text-xs opacity-90">Đang có</div>
                                <div className="font-bold text-lg">
                                  {project.totalProperties} tin đăng
                                </div>
                              </div>
                            )}
                          </div>
                        }
                      >
                        <div className="font-bold text-gray-800 line-clamp-1">
                          {project.name || project.title || 'Dự án / Khu trọ'}
                        </div>

                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          <EnvironmentFilled className="mr-1" />
                          {project.address || project.province || 'Chưa cập nhật địa chỉ'}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <Tag color="orange" className="m-0">
                            {project.projectType || 'Khu trọ'}
                          </Tag>

                          <span className="text-xs text-[#f96302] font-semibold">
                            Xem chi tiết
                          </span>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          )}


          {/* SECTION 4: DANH SÁCH CHÍNH */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <Title level={4}>Tin dành cho bạn</Title>

            </div>

            {loading && isInitialLoad ? (
              <div className="text-center py-20"><Spin size="large" /></div>
            ) : rooms.length === 0 ? (
              <Empty description="Không tìm thấy tin đăng nào" className="py-10" />
            ) : (
              <>
                <Row gutter={[16, 16]}>
                  {rooms.map(room => {
                    // 🟢 1. LOGIC MỚI: Xác định VIP
                    const isVip = (room.priorityLevel && room.priorityLevel > 0) || room.isPromoted;

                    return (
                      <Col xs={24} sm={12} md={8} lg={6} key={room.id}>
                        <Card
                          hoverable
                          // 🟢 2. STYLE CARD: Nếu VIP thì viền cam, đổ bóng đậm hơn
                          className={`rounded-lg overflow-hidden transition-all h-full flex flex-col ${isVip ? 'border-2 border-orange-200 shadow-md' : 'border border-gray-200 shadow-none hover:shadow-lg'}`}
                          style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}
                          cover={
                            <div className="relative h-48 overflow-hidden">
                              <img alt={room.title} src={getImageUrl(room)} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />

                              {/* Tag Loại hình (giữ nguyên) */}
                            

                              {isVip && (
                                <Tag color="#fadb14" className="absolute top-2 right-2 border-none font-bold text-[10px] m-0 flex items-center gap-1 shadow-sm text-black px-1.5 py-0.5 z-10">
                                  <CrownFilled /> {room.promotionPackageName || 'VIP'}
                                </Tag>
                              )}

                              {/* 🟢 4. ICON LỬA (Cho tin cực hot - Priority cao) */}
                              {(room.priorityLevel >= 50 || room.isPromoted) && (
                                <div className="absolute bottom-2 left-2 text-[#fadb14] animate-bounce drop-shadow-md z-10">
                                  <FireFilled style={{ fontSize: '18px' }} />
                                </div>
                              )}

                              {/* 🟢 5. ICON REELS NẾU CÓ VIDEO --- */}
                              {room.videoUrl && (
                                <div
                                  className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity z-20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInitialReelRoomId(room.id);
                                    setIsReelsOpen(true);
                                  }}
                                >
                                  <PlayCircleFilled className="text-white text-5xl drop-shadow-lg hover:scale-110 transition-transform" />
                                </div>
                              )}
                            </div>
                          }
                          onClick={() => {
                            interactionService
                              .trackClick(room.id, room.primarySource || "TRENDING")
                              .catch(() => { });

                            navigate(`/rooms/${room.id}`);
                          }}
                        >
                          {/* 🟢 5. TIÊU ĐỀ VIP: Có icon Vương miện đầu dòng */}
                          <h3 className={`font-bold text-sm mb-1 line-clamp-2 h-10 flex items-start gap-1 ${isVip ? 'text-[#f96302]' : 'text-gray-800'}`} title={room.title}>
                            {isVip && <CrownFilled className="mt-1 flex-shrink-0" />} {room.title}
                          </h3>

                          <div className="text-xs text-gray-500 mb-2 truncate"><EnvironmentFilled className="mr-1 text-gray-400" />{room.address}</div>
                          <div className="mt-auto pt-2 border-t border-dashed border-gray-200 flex justify-between items-end">
                            <span className="text-[#f96302] font-bold text-base">{formatCurrency(room.price)}/tháng</span>
                            <span className="text-xs text-gray-400">{room.area} m²</span>
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>

                {/* --- NÚT ĐIỀU KHIỂN NẰM GIỮA --- */}
                <div className="mt-12 flex justify-center pb-10">
                  {hasMore && rooms.length < 16 ? (
                    // Nút Mở rộng (Load thêm 8 tin để thành 16)
                    <Button
                      size="large"
                      className="px-12 h-12 font-semibold border-[#f96302] text-[#f96302] hover:bg-orange-50 rounded-md"
                      onClick={() => fetchRooms(true)}
                      loading={loading}
                    >
                      Mở rộng thêm tin
                    </Button>
                  ) : (rooms.length >= 16 || (!hasMore && rooms.length > 0)) ? (
                    // Nút Xem tất cả (Chuyển sang trang filter)
                    <Button
                      type="primary"
                      size="large"
                      className="px-12 h-12 font-bold bg-[#f96302] rounded-md shadow-md"
                      onClick={() => navigate('/filter', { state: filters })}
                    >
                      Xem tất cả kết quả <RightOutlined />
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      <ReelsViewer
        isOpen={isReelsOpen}
        onClose={() => { setIsReelsOpen(false); setInitialReelRoomId(null); }}
        initialRoomId={initialReelRoomId}
      />
      {contextHolder}
    </ConfigProvider>
  );
};
<Footer/>
export default HomePage;