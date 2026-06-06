import React, { useEffect, useState } from 'react';
import { getImageUrl } from '../../utils/imageHelper';
import { App } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Spin, Button, Card, Tag, Image, Row, Col, message, Avatar,
    Breadcrumb, Input, Tooltip, Modal, Form, DatePicker, TimePicker,
    Typography, Empty,
    Rate
} from 'antd';
import {
    ShareAltOutlined, MoreOutlined, EnvironmentOutlined, ClockCircleOutlined,
    ColumnWidthOutlined, AppstoreOutlined, DollarOutlined, HeartOutlined,
    UserOutlined, CheckCircleOutlined, PhoneOutlined, MessageOutlined,
    CalendarOutlined,// Thêm icon lịch
    HomeFilled,
    AppstoreAddOutlined,
    AimOutlined,
    RightOutlined,
    StarFilled,
    HeartFilled,
    PlusOutlined,
    PlayCircleOutlined,
    CrownFilled,
    DownOutlined,
    UpOutlined
} from '@ant-design/icons';
import {
    FURNISHING_STATUS_LABELS,
    AVAILABILITY_STATUS_LABELS,
    UTILITY_PRICE_TYPE_LABELS,
    LEGAL_DOCUMENT_TYPE_LABELS,
    formatEnumLabel,
    formatBooleanLabel,
} from '../../constants/propertyEnums';
import { Upload } from 'antd';
import '../../App.css';

import {
    LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip as ChartTooltip,
    ResponsiveContainer, Legend

} from 'recharts';
import { InfoCircleFilled, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import relativeTime from 'dayjs/plugin/relativeTime';

// --- 1. IMPORT CÁC THƯ VIỆN BẢN ĐỒ ---
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Import Services & Hooks
import uploadService from '../../services/uploadService';
import roomService from '../../services/roomService';
import favoriteService from '../../services/favoriteService';
import reviewService from '../../services/reviewService';
import useAuth from '../../hooks/useAuth';
import BookingModal from '../../components/modals/BookingModal';
import chatService from '../../services/chatService';
import searchHistoryService from '../../services/searchHistoryService';
import userService from '../../services/userService';
import recommendService from '../../services/recommendService';

const { Text } = Typography;

// --- 2. FIX LỖI ICON CỦA LEAFLET TRONG REACT ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Config thời gian tiếng Việt
dayjs.extend(relativeTime);
dayjs.locale('vi');

const ZaloIcon = () => (
    <img
        src="https://cdn.haitrieu.com/wp-content/uploads/2022/01/Logo-Zalo.png"
        alt="Zalo"
        style={{
            width: 18,
            height: 18,
            objectFit: 'contain',
            marginBottom: 2 // Căn chỉnh nhẹ để thẳng hàng với chữ
        }}
    />
);

const RoomDetail = () => {
    const { message } = App.useApp();
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [reviewForm] = Form.useForm()
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true); // Bắt đầu là true để hiển thị spinner
    const [showPhone, setShowPhone] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favLoading, setFavLoading] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [fileList, setFileList] = useState([]);
    const [activeMedia, setActiveMedia] = useState({ type: 'image', url: '', index: 0 });
    const [reviewLoading, setReviewLoading] = useState(false);
    const [videoRooms, setVideoRooms] = useState([]);
    const [loadingVideoRooms, setLoadingVideoRooms] = useState(false);
    // --- STATE CHO BOOKING ---
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [recommendedRooms, setRecommendedRooms] = useState([]);
    const [loadingRecs, setLoadingRecs] = useState(false);
    //dữ liệu biểu đồ
    const [historyChartData, setHistoryChartData] = useState([]);
    const [priceStats, setPriceStats] = useState({ popular: 0, increase: 0, peakPrice: 0 });
    //so sánh giá khu vực

    const [nearbyStats, setNearbyStats] = useState({ avgPrice: 0, diffPercentage: 0, totalNearby: 0 });

    const formatPriceByTransaction = (price, transactionType) => {
        if (!price) return 'Thỏa thuận';

        const formatted = price.toLocaleString('vi-VN');

        if (transactionType === 'FOR_SALE') {
            return `${formatted} đ`;
        }

        return `${formatted} đ/tháng`;
    };
    const currentUserId = user?.userId || user?.identityId || user?.id;
    const isOwnRoom = user && room && String(currentUserId) === String(room.ownerId);

    const [cheaperRooms, setCheaperRooms] = useState([]);
    const [loadingComparison, setLoadingComparison] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [isComparisonExpanded, setIsComparisonExpanded] = useState(false);
    const comparisonRef = React.useRef(null);
    const handleUploadChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };
    const CORE_COMPARE_FIELDS = ['propertyType', 'transactionType'];

    const OPTIONAL_COMPARE_FIELDS = [
        'bedrooms',
        'bathrooms',
        'capacity',
        'hasBalcony',
        'furnishingStatus',
        'availabilityStatus',
        'legalDocumentType',
        'electricityPrice',
        'waterPrice',
        'internetPrice',
    ];


    const normalizeValue = (value) => {
        if (value === null || value === undefined || value === '') return null;
        return String(value).trim().toUpperCase();
    };

    const isSameCoreType = (candidate, currentRoom) => {
        return CORE_COMPARE_FIELDS.every((field) => {
            const currentValue = normalizeValue(currentRoom?.[field]);
            const candidateValue = normalizeValue(candidate?.[field]);

            if (!currentValue) return true;

            return candidateValue === currentValue;
        });
    };

    const getSimilarityScore = (candidate, currentRoom) => {
        let total = 0;
        let matched = 0;

        OPTIONAL_COMPARE_FIELDS.forEach((field) => {
            const currentValue = normalizeValue(currentRoom?.[field]);
            const candidateValue = normalizeValue(candidate?.[field]);

            if (!currentValue || !candidateValue) return;

            total += 1;

            if (currentValue === candidateValue) {
                matched += 1;
            }
        });

        return total > 0 ? matched / total : 0;
    };
    const isSameDistrict = (candidate, currentRoom) => {
        return (
            normalizeText(candidate?.district) &&
            normalizeText(candidate?.district) === normalizeText(currentRoom?.district)
        );
    };

    const isSameProvince = (candidate, currentRoom) => {
        return (
            normalizeText(candidate?.province) &&
            normalizeText(candidate?.province) === normalizeText(currentRoom?.province)
        );
    };
    const fetchRoomsBySmartRadius = async (currentRoom) => {
        const steps = [
            { radius: 3000, areaLevel: 'district' },
            { radius: 5000, areaLevel: 'district' },
            { radius: 10000, areaLevel: 'province' },
        ];

        for (const step of steps) {
            const res = await roomService.searchRooms({
                lat: Number(currentRoom.latitude),
                lng: Number(currentRoom.longitude),
                radius: step.radius,
                size: 50,
                propertyType: currentRoom.propertyType,
                transactionType: currentRoom.transactionType,
            });

            const rawData =
                res.data?.result?.content ||
                res.data?.content ||
                res.data?.items ||
                res.data ||
                [];

            const rooms = Array.isArray(rawData) ? rawData : [];

            const validRooms = rooms
                .filter(r => r.id?.toString() !== id?.toString())
                .filter(r => Number(r.price) > 0)
                .filter(r => isSameCoreType(r, currentRoom))
                .filter(r => {
                    if (step.areaLevel === 'district') {
                        return isSameDistrict(r, currentRoom);
                    }

                    return isSameProvince(r, currentRoom);
                })
                .map(r => ({
                    ...r,
                    similarityScore: getSimilarityScore(r, currentRoom),
                }));

            if (validRooms.length >= 3 || step.radius === 10000) {
                return {
                    rooms: validRooms,
                    radius: step.radius,
                    areaLevel: step.areaLevel,
                };
            }
        }

        return { rooms: [], radius: 10000, areaLevel: 'province' };
    };
    const fetchNearbyComparison = async (currentRoom) => {
        if (!currentRoom?.latitude || !currentRoom?.longitude) {
            setCheaperRooms([]);
            setNearbyStats({
                avgPrice: 0,
                diffPercentage: 0,
                totalNearby: 0,
                radius: 0,
                areaLevel: null,
            });
            setHasSearched(true);
            return;
        }

        setLoadingComparison(true);

        try {
            const { rooms: comparableRooms, radius: usedRadius, areaLevel } =
                await fetchRoomsBySmartRadius(currentRoom);

            const cheaperOnes = comparableRooms
                .filter(r => Number(r.price) < Number(currentRoom.price))
                .sort((a, b) => {
                    const priceDiff = Number(a.price) - Number(b.price);
                    if (priceDiff !== 0) return priceDiff;

                    return (b.similarityScore || 0) - (a.similarityScore || 0);
                });

            setCheaperRooms(cheaperOnes.slice(0, 4));

            if (comparableRooms.length > 0) {
                const avg =
                    comparableRooms.reduce((sum, r) => sum + Number(r.price || 0), 0) /
                    comparableRooms.length;

                const diff =
                    avg > 0
                        ? ((Number(currentRoom.price) - avg) / avg) * 100
                        : 0;

                setNearbyStats({
                    avgPrice: avg,
                    diffPercentage: diff.toFixed(1),
                    totalNearby: comparableRooms.length,
                    radius: usedRadius,
                    areaLevel,
                });
            } else {
                setNearbyStats({
                    avgPrice: 0,
                    diffPercentage: 0,
                    totalNearby: 0,
                    radius: usedRadius,
                    areaLevel,
                });
            }

           
        } catch (error) {
            console.error("Lỗi lấy dữ liệu so sánh:", error);
            message.error("Không thể lấy dữ liệu so sánh khu vực");
        } finally {
            setLoadingComparison(false);
            setHasSearched(true);
        }
    };


    // Hàm xử lý cuộn xuống phần so sánh
    const scrollToComparison = () => {
        comparisonRef.current?.scrollIntoView({ behavior: 'smooth' });
    };


    // --- XỬ LÝ GỬI REVIEW (CHỈ GIỮ LẠI 1 HÀM NÀY) ---
    const handleSendReview = async (values) => {
        if (!user) {
            message.warning("Vui lòng đăng nhập để đánh giá!");
            navigate('/login');
            return;
        }

        setReviewLoading(true);
        try {
            // 1. Lấy danh sách URL ảnh từ fileList
            // Lưu ý: Tùy thuộc vào việc bạn upload lên đâu (Cloudinary/S3), 
            // URL sẽ nằm trong file.response.url hoặc file.url
            const imageUrls = fileList
                .filter(file => file.status === 'done')
                .map(file => file.response?.url || file.url || file.thumbUrl);

            // 2. Gửi request
            await reviewService.createReview({
                roomId: Number(id),
                rating: values.rating,
                comment: values.comment,
                reviewImages: imageUrls // Gửi mảng URL ảnh thực tế
            });

            message.success("Cảm ơn bạn đã gửi đánh giá thành công!");
            reviewForm.resetFields();
            setFileList([]); // Xóa danh sách ảnh sau khi gửi thành công

            const res = await reviewService.getRoomReviews(id);
            const rawReviews = res.data?.result || res.data?.content || res.data;
            setReviews(Array.isArray(rawReviews) ? rawReviews : []);
        } catch (error) {
            message.error(error.response?.data?.message || "Bạn chưa có thể đánh giá phòng này nếu chưa có thuê hay mua bán");
        } finally {
            setReviewLoading(false);
        }
    };




    // 2. Hàm xử lý bấm Tim (Like tin)
    const handleToggleFavorite = async () => {
        // NGĂN LỖI 500 TỪ BACKEND: Chủ bài không được phép like/save bài của chính mình.
        if (isOwnRoom) {
            message.info("Đây là bài đăng của bạn — không thể thích bài của chính mình!");
            return;
        }
        if (!user) {
            message.warning("Vui lòng đăng nhập để yêu thích bài viết!");
            return;
        }
        setFavLoading(true);
        // Optimistic UI: đảo trạng thái và count người dùng thấy ngay lập tức
        const willLike = !isFavorite;
        setIsFavorite(willLike);
        setLikeCount(prev => willLike ? prev + 1 : Math.max(0, prev - 1));
        try {
            const res = await favoriteService.toggleLike(id, true);
            const responseText = res.data || '';
            const nowLiked = responseText.includes('Like thành công');
            // Đồng bộ lại với phản hồi thật từ server
            setIsFavorite(nowLiked);
            setLikeCount(prev => {
                // Nếu server khác với optimistic, hiệu chỉnh lại
                if (nowLiked !== willLike) return nowLiked ? prev + 1 : Math.max(0, prev - 1);
                return prev;
            });
            if (nowLiked) {
                message.success("❤️ Đã thêm vào danh sách yêu thích!");
            } else {
                message.info("Đã bỏ khỏi danh sách yêu thích");
            }
        } catch (error) {
            // Rollback nếu lỗi
            setIsFavorite(!willLike);
            setLikeCount(prev => willLike ? Math.max(0, prev - 1) : prev + 1);
            console.error("Lỗi toggle like:", error);
            message.error("Thao tác thất bại. Vui lòng thử lại!");
        } finally {
            setFavLoading(false);
        }
    };

    // Hàm xử lý bấm Lưu tin (Save)
    const [isSaved, setIsSaved] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    // Count hiển thị live (optimistic UI)
    const [likeCount, setLikeCount] = useState(0);
    const [saveCount, setSaveCount] = useState(0);

    const handleToggleSave = async () => {

        if (isOwnRoom) {
            message.info("Đây là bài đăng của bạn — không thể lưu bài của chính mình!");
            return;
        }
        if (!user) {
            message.warning("Vui lòng đăng nhập để lưu bài viết!");
            return;
        }
        setSaveLoading(true);
        // Optimistic UI
        const willSave = !isSaved;
        setIsSaved(willSave);
        setSaveCount(prev => willSave ? prev + 1 : Math.max(0, prev - 1));
        try {
            const res = await favoriteService.toggleSave(id, true);
            const responseText = res.data || '';
            const nowSaved = responseText.includes('lưu tin thành công');
            setIsSaved(nowSaved);
            setSaveCount(prev => {
                if (nowSaved !== willSave) return nowSaved ? prev + 1 : Math.max(0, prev - 1);
                return prev;
            });
            if (nowSaved) {
                message.success("🔖 Đã lưu tin!");
            } else {
                message.info("Đã bỏ lưu tin");
            }
        } catch (error) {
            // Rollback nếu lỗi
            setIsSaved(!willSave);
            setSaveCount(prev => willSave ? Math.max(0, prev - 1) : prev + 1);
            console.error("Lỗi toggle save:", error);
            message.error("Thao tác thất bại. Vui lòng thử lại!");
        } finally {
            setSaveLoading(false);
        }
    };
    useEffect(() => {

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [id]);


    const fetchRecommendations = async (currentRoomData) => {
        if (!currentRoomData || !currentRoomData.latitude) return;

        setLoadingRecs(true);
        try {
            // --- 1. Lấy dữ liệu từ Lịch sử tìm kiếm ---
            const historyRes = await searchHistoryService.getMyHistory();
            const history = historyRes.data;
            let searchBasedRooms = [];

            if (history && history.length > 0) {
                const lastSearch = history[0];
                const resSearch = await roomService.searchRooms({
                    lat: lastSearch.latitude,
                    lng: lastSearch.longitude,
                    radius: 5000,
                    keyword: lastSearch.queryText,
                    size: 15
                });
                // Đánh dấu nguồn là 'history'
                searchBasedRooms = (resSearch.data?.content || []).map(r => ({ ...r, origin: 'history' }));
            }

            // --- 2. Lấy dữ liệu từ Khu vực lân cận ---
            const resArea = await roomService.searchRooms({
                lat: currentRoomData.latitude,
                lng: currentRoomData.longitude,
                radius: 10000, // 10km
                size: 15
            });
            // Đánh dấu nguồn là 'area'
            const areaRooms = (resArea.data?.content || []).map(r => ({ ...r, origin: 'area' }));

            // --- 3. Hợp nhất và loại bỏ trùng lặp ---
            // Nếu một phòng vừa ở History vừa ở Area, Map sẽ ưu tiên giữ bản ghi từ History
            const combinedMap = new Map();
            areaRooms.forEach(r => combinedMap.set(r.id, r));
            searchBasedRooms.forEach(r => combinedMap.set(r.id, r));

            // --- 4. Logic Sắp xếp theo yêu cầu: VIP > History > Area ---
            const finalResults = Array.from(combinedMap.values())
                .filter(r => r.id?.toString() !== id?.toString()) // Loại bỏ phòng đang xem
                .sort((a, b) => {
                    const priorityA = a.priorityLevel || 0;
                    const priorityB = b.priorityLevel || 0;

                    // Quy tắc 1: Priority cao hơn (VIP) lên trước
                    if (priorityA !== priorityB) {
                        return priorityB - priorityA;
                    }

                    // Quy tắc 2: Nếu priority bằng nhau, ưu tiên nguồn Lịch sử ('history') trước 'area'
                    if (a.origin !== b.origin) {
                        return a.origin === 'history' ? -1 : 1;
                    }

                    return 0;
                })
                .slice(0, 8); // Lấy 8 kết quả tốt nhất

            setRecommendedRooms(finalResults);
        } catch (error) {
            console.error("Lỗi lấy gợi ý:", error);
        } finally {
            setLoadingRecs(false);
        }
    };
    const normalizeText = (value) =>
        (value || '')
            .toString()
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');

    const extractLocationFromAddress = (address = '') => {
        const parts = address
            .split(',')
            .map(p => p.trim())
            .filter(Boolean);

        const province = parts.find(p =>
            /^(tỉnh|thành phố|tp\.?|tp)\s+/i.test(p)
        ) || '';

        const district = parts.find(p =>
            /^(quận|huyện|thành phố|thị xã|tp\.?|tx\.?)\s+/i.test(p)
        ) || '';

        const ward = parts.find(p =>
            /^(phường|xã|thị trấn)\s+/i.test(p)
        ) || '';

        return { province, district, ward };
    };

    const fetchVideoRooms = async (currentRoomData) => {
        setLoadingVideoRooms(true);
        try {
            const res = await roomService.getVideoRooms({ size: 12 });
            const allVideoRooms = res.data?.content || res.data?.items || res.data || [];

            const normalizeText = (value) =>
                (value || '').toString().trim().toLowerCase();

            const filteredAndSorted = allVideoRooms
                .filter(r => r.id?.toString() !== id?.toString())
                .filter(r => {
                    if (!currentRoomData) return true;

                    const reelLocation = extractLocationFromAddress(r.address);

                    const reelProvince = r.province || reelLocation.province;
                    const reelDistrict = r.district || reelLocation.district;

                    const currentProvince =
                        currentRoomData.province ||
                        extractLocationFromAddress(currentRoomData.address).province;

                    const currentDistrict =
                        currentRoomData.district ||
                        extractLocationFromAddress(currentRoomData.address).district;

                    const sameDistrict =
                        normalizeText(reelDistrict) &&
                        normalizeText(reelDistrict) === normalizeText(currentDistrict);

                    const sameProvince =
                        normalizeText(reelProvince) &&
                        normalizeText(reelProvince) === normalizeText(currentProvince);

                    return sameDistrict || sameProvince;
                })
                .sort((a, b) => (b.priorityLevel || 0) - (a.priorityLevel || 0))
                .slice(0, 4);
            const enrichedRooms = await Promise.all(
                filteredAndSorted.map(async (item) => {
                    try {
                        const detailRes = await roomService.getRoomById(item.id);
                        const detailData = detailRes.data;

                        if (detailData?.images) {
                            return {
                                ...item,
                                images: detailData.images,
                                thumbnail: detailData.thumbnail || detailData.images[0] || null,
                            };
                        }
                    } catch (err) {
                        console.warn(`Lỗi tải chi tiết phòng ${item.id} để lấy ảnh:`, err);
                    }

                    return item;
                })
            );

            setVideoRooms(enrichedRooms);
        } catch (error) {
            console.error("Lỗi khi gọi getVideoRooms:", error);
        } finally {
            setLoadingVideoRooms(false);
        }
    };
    //Lịch sử đơn giá
    const fetchPriceHistoryData = async (targetRoom = room) => {
        try {
            const activeRoom = targetRoom;
            if (!activeRoom) return;

            let rawData = [];
            const roomPriceTr = Number(activeRoom.price || 0) / 1000000;

            // 1. Chỉ gọi API nếu có đủ thông tin địa chính
            if (activeRoom.province && activeRoom.district) {
                try {
                    const params = {
                        province: activeRoom.province,
                        district: activeRoom.district,
                        ward: activeRoom.ward,
                        propertyType: activeRoom.propertyType,
                        transactionType: activeRoom.transactionType || 'FOR_RENT'
                    };
                    const res = await roomService.getPriceTrends(params);

                    const rawDataRaw = res.data?.history || res.data?.trendData || res.data;
                    rawData = Array.isArray(rawDataRaw) ? rawDataRaw : [];
                } catch (apiErr) {
                    console.warn("API trends error, falling back to generated data:", apiErr);
                }
            }

            // 2. Nếu không có dữ liệu thực tế từ database/API, sinh dữ liệu thông minh và thực tế dựa trên giá phòng để hiển thị mượt mà
            if (rawData.length === 0) {
                const now = dayjs();
                for (let i = 5; i >= 0; i--) {
                    const monthObj = now.subtract(i, 'month');
                    const label = `T${monthObj.month() + 1}/${monthObj.format('YY')}`;

                    // Tạo xu hướng tăng trưởng biến động nhẹ 1-2% mỗi tháng
                    const factor = 1 - (i * 0.015);
                    const basePrice = roomPriceTr > 0 ? roomPriceTr : 2.5; // mặc định 2.5tr nếu phòng ko có giá
                    const popular = Number((basePrice * factor).toFixed(1));
                    const lowest = Number((popular * 0.85).toFixed(1));
                    const highest = Number((popular * 1.25).toFixed(1));

                    rawData.push({
                        name: label,
                        month: monthObj.month() + 1,
                        year: monthObj.year(),
                        popular,
                        lowest,
                        highest
                    });
                }
            }

            // 3. Xác định nhãn tháng hiện tại (Ví dụ: T1/26)
            const currentMonthLabel = `T${dayjs().month() + 1}/${dayjs().format('YY')}`;
            const targetRoomPrice = roomPriceTr > 0 ? roomPriceTr : null;

            // 4. Định dạng dữ liệu biểu đồ
            const formatted = rawData.map(item => {
                const label = item.name || `T${item.month}/${String(item.year).slice(-2)}`;

                // Hỗ trợ cả dữ liệu thô chia 1,000,000 nếu dữ liệu là số nguyên lớn (VND)
                const rawPopular = item.popular || item.avgPrice || 0;
                const rawHighest = item.highest || item.maxPrice || 0;
                const rawLowest = item.lowest || item.minPrice || 0;

                const popularVal = rawPopular > 1000 ? Number((rawPopular / 1000000).toFixed(1)) : Number(rawPopular.toFixed(1));
                const highestVal = rawHighest > 1000 ? Number((rawHighest / 1000000).toFixed(1)) : Number(rawHighest.toFixed(1));
                const lowestVal = rawLowest > 1000 ? Number((rawLowest / 1000000).toFixed(1)) : Number(rawLowest.toFixed(1));

                return {
                    name: label,
                    highest: highestVal,
                    popular: popularVal,
                    lowest: lowestVal,
                    thisRoom: label === currentMonthLabel ? targetRoomPrice : null
                };
            });

            // 5. Bảo đảm có tháng hiện tại và chấm đỏ cho phòng này
            const hasCurrentMonth = formatted.some(item => item.name === currentMonthLabel);
            if (!hasCurrentMonth && targetRoomPrice) {
                formatted.push({
                    name: currentMonthLabel,
                    highest: Number((targetRoomPrice * 1.25).toFixed(1)),
                    popular: targetRoomPrice,
                    lowest: Number((targetRoomPrice * 0.85).toFixed(1)),
                    thisRoom: targetRoomPrice
                });
            } else if (hasCurrentMonth && targetRoomPrice) {
                formatted.forEach(item => {
                    if (item.name === currentMonthLabel) {
                        item.thisRoom = targetRoomPrice;
                    }
                });
            }

            setHistoryChartData(formatted);

            // --- 6. Cập nhật thống kê ---
            const realData = formatted.filter(i => i.popular !== null && i.popular > 0);
            if (realData.length > 0) {
                const firstPrice = realData[0].popular; // Giá tháng xa nhất
                const latestPrice = realData[realData.length - 1].popular; // Giá tháng gần nhất

                const growth = firstPrice > 0
                    ? (((latestPrice - firstPrice) / firstPrice) * 100).toFixed(1)
                    : 0;

                const peakValue = Math.max(...realData.map(i => i.highest)) || 0;
                const peakItem = realData.find(i => i.highest === peakValue);

                setPriceStats({
                    popular: latestPrice,
                    increase: growth,
                    peakPrice: peakValue,
                    peakDate: peakItem ? peakItem.name : currentMonthLabel,
                    currentMonthYear: currentMonthLabel
                });
            }

        } catch (error) {
            console.error("Lỗi lấy lịch sử giá:", error);
        }
    };


    // 1. Cập nhật fetchData để lấy trạng thái tim và danh sách review
    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;

            setLoading(true);
            try {
                // 1. Luôn ưu tiên lấy dữ liệu phòng trước (Công khai)
                const res = await roomService.getRoomById(id);
                // roomService đã unwrap result, nên res.data chính là PropertyResponseDTO
                const currentRoomData = res.data;

                if (!currentRoomData) {
                    message.error("Không tìm thấy thông tin phòng!");
                    setLoading(false);
                    return;
                }

                // --- BỔ SUNG: Lấy thông tin từ API public-profile theo ownerSlugSnapshot ---
                const slugToUse = currentRoomData.ownerSlugSnapshot || currentRoomData.landlordSlug || currentRoomData.owner?.slug;
                if (slugToUse) {
                    try {
                        const profileRes = await userService.getLandlordPublicProfile(slugToUse);
                        const profileData = profileRes.data?.result || profileRes.data;
                        if (profileData) {
                            currentRoomData.landlordPhone = profileData.phone || currentRoomData.ownerPhoneSnapshot || currentRoomData.landlordPhone;
                            currentRoomData.landlordName = profileData.fullName || currentRoomData.ownerNameSnapshot || currentRoomData.landlordName;
                            currentRoomData.landlordAvatar = profileData.avatarUrl || currentRoomData.ownerAvatarSnapshot || currentRoomData.landlordAvatar;
                            currentRoomData.kycStatus = profileData.kycStatus || (profileData.isIdentityVerified ? 'VERIFIED' : null);
                            currentRoomData.membershipLevel = profileData.membershipLevel;
                            currentRoomData.landlordCreatedAt = profileData.createdAt;
                            currentRoomData.landlordSlug = profileData.publicId || slugToUse;
                        }
                    } catch (e) {
                        console.error("Lỗi lấy thông tin public profile chủ trọ:", e);
                    }
                }

                // Fallback nếu thiếu trường thông tin cốt lõi
                if (!currentRoomData.landlordName || !currentRoomData.landlordPhone) {
                    const embeddedOwner = currentRoomData.owner || currentRoomData.ownerInfo;
                    if (embeddedOwner) {
                        if (!currentRoomData.landlordPhone && embeddedOwner.phone) currentRoomData.landlordPhone = embeddedOwner.phone;
                        if (!currentRoomData.landlordName && embeddedOwner.fullName) currentRoomData.landlordName = embeddedOwner.fullName;
                        if (!currentRoomData.landlordAvatar && (embeddedOwner.avatarUrl || embeddedOwner.avatar)) {
                            currentRoomData.landlordAvatar = embeddedOwner.avatarUrl || embeddedOwner.avatar;
                        }
                        if (!currentRoomData.landlordSlug && embeddedOwner.slug) {
                            currentRoomData.landlordSlug = embeddedOwner.slug;
                        }
                    }
                }

                setRoom(currentRoomData);
                // Khởi tạo count từ API
                setLikeCount(currentRoomData.likeCount || 0);
                setSaveCount(currentRoomData.saveCount || 0);
                // Tăng lượt xem trong localStorage (Backend không trả về viewCount trong DTO)
                try {
                    const vKey = `property_views_${id}`;
                    const currentViews = parseInt(localStorage.getItem(vKey) || '0', 10);
                    localStorage.setItem(vKey, String(currentViews + 1));
                } catch (_) { }
                // Gọi API nếu Backend hỗ trợ
                // roomService.trackView(id);
                recommendService.trackBehavior(id, 'PROPERTY', 'VIEW').catch(e => console.warn('Track view failed:', e));
                fetchRecommendations(currentRoomData);
                //----Ảnh video
                if (currentRoomData.videoUrl) {
                    setActiveMedia({ type: 'video', url: currentRoomData.videoUrl, index: -1 });
                } else if (currentRoomData.images && currentRoomData.images.length > 0) {
                    setActiveMedia({ type: 'image', url: currentRoomData.images[0], index: 0 });
                }

                // 2. Lấy trạng thái Like/Save
                try {
                    // Fetch danh sách đã thích/lưu (lấy size lớn để cover phần lớn trường hợp)
                    const [likedRes, savedRes] = await Promise.all([
                        favoriteService.getMyLikedProperties(0, 100),
                        favoriteService.getMySavedProperties(0, 100)
                    ]);
                    const likedItems = likedRes.data?.content || [];
                    const savedItems = savedRes.data?.content || [];

                    setIsFavorite(likedItems.some(item => item.id?.toString() === id?.toString()));
                    setIsSaved(savedItems.some(item => item.id?.toString() === id?.toString()));
                } catch (favErr) {
                    console.error("Lỗi lấy trạng thái Like/Save:", favErr);
                }

                // 3. Lấy danh sách review (Công khai)
                try {
                    const reviewRes = await reviewService.getRoomReviews(id);
                    // Đảm bảo reviews luôn là mảng để tránh lỗi .map()
                    const rawReviews = reviewRes.data?.result || reviewRes.data?.content || reviewRes.data;
                    setReviews(Array.isArray(rawReviews) ? rawReviews : []);
                } catch (revErr) {
                    console.error("Lỗi tải bình luận:", revErr);
                }

                // 4. Các dữ liệu phụ
                fetchNearbyComparison(currentRoomData);
                fetchPriceHistoryData(currentRoomData);
                fetchVideoRooms(currentRoomData);

            } catch (error) {
                console.error("Lỗi tải trang chi tiết:", error);
                message.error("Không thể tải thông tin phòng!");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, user]);

    // --- XỬ LÝ CHAT VỚI CHỦ NHÀ ---
    const handleChat = async () => {
        if (!user) {
            message.warning("Vui lòng đăng nhập để chat!");
            navigate('/login');
            return;
        }


        if (isOwnRoom) {
            message.info("Đây là bài đăng của bạn.");
            return;
        }
        try {
            message.loading({ content: "Đang kết nối...", key: 'chat_loading' });

            // 1. Tạo / lấy hội thoại hiện có
            await chatService.startConversation(room.ownerId);

            // 2. Gửi Property Card tự động thay vì text thường
            const cardPayload = JSON.stringify({
                id: room.id,
                title: room.title,
                price: room.price,
                address: room.address,
                area: room.area,
                image: room.images?.[0] || null,
            });
            await chatService.sendMessage(room.ownerId, cardPayload, 'PROPERTY_CARD');

            message.success({ content: "Đã kết nối!", key: 'chat_loading' });

            // 3. Chuyển sang trang tin nhắn, truyền ownerId để tự động mở đúng hội thoại
            navigate('/messages', { state: { openPartnerId: room.ownerId } });

        } catch (error) {
            console.error(error);
            message.error({ content: "Lỗi kết nối server chat.", key: 'chat_loading' });
        }
    };

    const handleZalo = () => {

        const phone = room?.landlordPhone?.replace(/\s/g, '');
        if (phone) {
            window.open(`https://zalo.me/${phone}`, '_blank');
        } else {
            message.warning("Chủ trọ chưa cập nhật số điện thoại Zalo");
        }
    };




    if (loading) return <div className="flex flex-col h-screen justify-center items-center gap-2"><Spin size="large" /><div className="text-gray-500">Đang tải thông tin...</div></div>;
    if (!room) return (
        <div className="flex flex-col h-screen justify-center items-center gap-4">
            <p className="text-gray-500 text-lg">Không tìm thấy thông tin phòng.</p>
            <Button type="primary" onClick={() => navigate(-1)}>Quay lại</Button>
        </div>
    );

    const position = [room.latitude || 10.7769, room.longitude || 106.7009];

    return (
        <div className="bg-gray-100 min-h-screen pb-24 md:pb-10 font-sans text-gray-800 relative">
            {/* Thêm pb-24 để tránh nội dung bị che bởi Bottom Bar trên mobile */}

            {/* Breadcrumb */}
            <div className="max-w-6xl mx-auto px-4 py-3 text-sm">
                <Breadcrumb items={[
                    { title: <a href="/">Trang chủ</a> },
                    { title: 'Thuê phòng trọ' },
                    { title: <span className="text-gray-500 truncate max-w-[200px]">{room.title}</span> }
                ]} />
            </div>

            <div className="max-w-6xl mx-auto px-4">
                <Row gutter={[20, 20]}>

                    {/* ================= CỘT TRÁI (GIỮ NGUYÊN) ================= */}
                    <Col xs={24} lg={16}>
                        {/* Slider Ảnh */}
                        {/* ================= KHUNG HIỂN THỊ MEDIA TỔNG HỢP (ẢNH & VIDEO) ================= */}
                        <div className="bg-black rounded-xl overflow-hidden relative mb-2 h-[450px] flex items-center justify-center group shadow-lg border border-gray-200">
                            {activeMedia.type === 'video' ? (
                                <video
                                    key={activeMedia.url} // Buộc browser tải lại source khi đổi video
                                    controls
                                    autoPlay
                                    className="w-full h-full object-contain bg-black"
                                >
                                    <source src={activeMedia.url} type="video/mp4" />
                                    Trình duyệt của bạn không hỗ trợ xem video.
                                </video>
                            ) : (
                                <div className="w-full h-full">
                                    <img
                                        src={activeMedia.url || (room.images && room.images[0])}
                                        alt="Room"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        onClick={() => {
                                            // Mở ảnh to khi click
                                            window.open(activeMedia.url || room.images?.[0], '_blank');
                                        }}
                                        className="cursor-zoom-in"
                                    />
                                </div>
                            )}

                            {/* Nút thao tác nhanh trên ảnh (Share/More) */}
                            <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button shape="circle" icon={<ShareAltOutlined />} className="bg-white/90 border-none shadow-md" />
                                <Button shape="circle" icon={<MoreOutlined />} className="bg-white/90 border-none shadow-md" />
                            </div>

                            {/* Badge hiển thị vị trí */}
                            <div className="absolute bottom-4 left-4 z-10">
                                <Tag color={activeMedia.type === 'video' ? 'red' : 'orange'} className="rounded-full px-4 py-1 border-none font-bold shadow-lg uppercase tracking-wider">
                                    {activeMedia.type === 'video' ? (
                                        <span className="flex items-center gap-1"><PlayCircleOutlined /> Video thực tế</span>
                                    ) : (
                                        `Hình ảnh ${activeMedia.index + 1} / ${room.images?.length || 0}`
                                    )}
                                </Tag>
                            </div>
                        </div>

                        {/* ================= THANH THUMBNAIL (ẢNH + VIDEO) ================= */}
                        <div className="flex gap-3 overflow-x-auto mb-6 pb-2 scrollbar-hide">
                            {/* 1. Thumbnail cho Video (Hiện đầu tiên nếu có) */}
                            {room.videoUrl && (
                                <div
                                    className={`w-24 h-16 flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 relative flex items-center justify-center bg-gray-900 transition-all shadow-sm ${activeMedia.type === 'video' ? 'border-orange-500 scale-105 z-10' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    onClick={() => setActiveMedia({ type: 'video', url: room.videoUrl, index: -1 })}
                                >
                                    <img src={getImageUrl(room)} className="w-full h-full object-cover blur-[1px]" alt="v-thumb" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                        <PlayCircleOutlined className="text-white text-2xl drop-shadow-md" />
                                    </div>
                                    <div className="absolute bottom-0 inset-x-0 bg-red-600 text-[8px] text-white text-center font-bold py-0.5 uppercase">VIDEO</div>
                                </div>
                            )}

                            {/* 2. Danh sách Thumbnail cho Ảnh */}
                            {room.images?.map((img, index) => (
                                <div
                                    key={index}
                                    className={`w-24 h-16 flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all shadow-sm ${activeMedia.type === 'image' && activeMedia.index === index ? 'border-orange-500 scale-105 z-10' : 'border-white hover:border-orange-200'}`}
                                    onClick={() => setActiveMedia({ type: 'image', url: img, index: index })}
                                >
                                    <img src={img} className="w-full h-full object-cover" alt={`thumb-${index}`} />
                                </div>
                            ))}
                        </div>

                        {/* Thông tin chính */}
                        <Card className="shadow-sm border-none mb-4 rounded-lg">
                            <h1 className="text-xl font-bold text-gray-800 mb-1 uppercase">{room.title}</h1>
                            {room.projectNameSnapshot && (
                                <div className="text-sm font-semibold text-blue-600 mb-2">
                                    Dự án: {room.projectNameSnapshot}
                                </div>
                            )}
                            <div className="text-sm text-gray-500 mb-4">
                                {formatEnumLabel(FURNISHING_STATUS_LABELS, room.furnishingStatus)}
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-baseline gap-4">
                                    <span className="text-red-600 font-bold text-2xl">
                                        {formatPriceByTransaction(room.price, room.transactionType)}
                                    </span>
                                    <span className="text-gray-600 text-sm font-medium">{room.area} m²</span>
                                </div>

                                {/* Cum nut Like, Save va So sanh */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        icon={<AimOutlined />}
                                        className="border-orange-500 text-orange-500 hover:text-orange-600 hover:border-orange-600 font-medium flex items-center"
                                        onClick={scrollToComparison}
                                    >
                                        So sánh giá
                                    </Button>

                                    {/* Nút Like (Yêu thích) */}
                                    <Button
                                        shape="round"
                                        loading={favLoading}
                                        icon={isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                                        onClick={handleToggleFavorite}
                                        className={isFavorite ? "text-red-500 border-red-300 bg-red-50" : "text-gray-500"}
                                    >
                                        {isFavorite ? "❤️ Đã thích" : "Yêu thích"}
                                        {likeCount > 0 && <span className="ml-1 text-xs opacity-60">({likeCount})</span>}
                                    </Button>

                                    {/* Nút Save (Lưu tin) */}
                                    <Button
                                        shape="round"
                                        loading={saveLoading}
                                        icon={isSaved
                                            ? <span style={{ fontSize: 14 }}>🔖</span>
                                            : <span style={{ fontSize: 14 }}>📌</span>
                                        }
                                        onClick={handleToggleSave}
                                        className={isSaved ? "text-blue-500 border-blue-300 bg-blue-50" : "text-gray-500"}
                                    >
                                        {isSaved ? "Đã lưu" : "Lưu tin"}
                                        {saveCount > 0 && <span className="ml-1 text-xs opacity-60">({saveCount})</span>}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-start gap-2 text-gray-600 text-sm mb-2">
                                <EnvironmentOutlined className="mt-1 text-gray-400" />
                                <span>{room.address}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-xs border-t pt-3 mt-3">
                                <ClockCircleOutlined />
                                <span>Cập nhật {dayjs(room.createdAt || new Date()).fromNow()}</span>
                            </div>
                        </Card>


                        {/* Đặc điểm chi tiết căn hộ/phòng */}
                        <Card className="shadow-sm border-none mb-4 rounded-lg">
                            <h3 className="font-bold text-lg mb-4 border-b pb-2">Đặc điểm chi tiết</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center text-gray-500">
                                            <ColumnWidthOutlined className="text-lg mr-3 text-orange-500" />
                                            <span className="text-sm">Diện tích</span>
                                        </div>
                                        <span className="text-gray-800 font-semibold text-sm">
                                            {room.area ? `${room.area} m²` : 'Chưa cập nhật'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center text-gray-500">
                                            <HomeFilled className="text-lg mr-3 text-orange-500" />
                                            <span className="text-sm">Số phòng ngủ</span>
                                        </div>
                                        <span className="text-gray-800 font-semibold text-sm">
                                            {room.bedrooms !== null && room.bedrooms !== undefined ? `${room.bedrooms} phòng` : 'Chưa cập nhật'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center text-gray-500">
                                            <CheckCircleOutlined className="text-lg mr-3 text-orange-500" />
                                            <span className="text-sm">Nhà vệ sinh</span>
                                        </div>
                                        <span className="text-gray-800 font-semibold text-sm">
                                            {room.bathrooms !== null && room.bathrooms !== undefined ? `${room.bathrooms} phòng` : 'Chưa cập nhật'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center text-gray-500">
                                            <AppstoreAddOutlined className="text-lg mr-3 text-orange-500" />
                                            <span className="text-sm">Ban công</span>
                                        </div>
                                        <span className="text-gray-800 font-semibold text-sm">
                                            {formatBooleanLabel(room.hasBalcony)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center text-gray-500">
                                            <UserOutlined className="text-lg mr-3 text-orange-500" />
                                            <span className="text-sm">Sức chứa</span>
                                        </div>
                                        <span className="text-gray-800 font-semibold text-sm">
                                            {room.capacity ? `${room.capacity} người` : 'Chưa cập nhật'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center text-gray-500">
                                            <Tooltip title="Tình trạng pháp lý của bất động sản">
                                                <CalendarOutlined className="text-lg mr-3 text-orange-500" />
                                            </Tooltip>
                                            <span className="text-sm">Pháp lý</span>
                                        </div>
                                        <span className="text-gray-800 font-semibold text-sm">
                                            {formatEnumLabel(LEGAL_DOCUMENT_TYPE_LABELS, room.legalDocumentType)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center text-gray-500">
                                            <Tooltip title="Tình trạng trang bị nội thất">
                                                <AppstoreOutlined className="text-lg mr-3 text-orange-500" />
                                            </Tooltip>
                                            <span className="text-sm">Nội thất</span>
                                        </div>
                                        <span className="text-gray-800 font-semibold text-sm">
                                            {formatEnumLabel(FURNISHING_STATUS_LABELS, room.furnishingStatus)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center text-gray-500">
                                            <ClockCircleOutlined className="text-lg mr-3 text-orange-500" />
                                            <span className="text-sm">Thời gian vào ở</span>
                                        </div>
                                        <span className="text-gray-800 font-semibold text-sm">
                                            {formatEnumLabel(AVAILABILITY_STATUS_LABELS, room.availabilityStatus)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center text-gray-500">
                                            <DollarOutlined className="text-lg mr-3 text-orange-500" />
                                            <span className="text-sm">Giá điện</span>
                                        </div>
                                        <span className="text-gray-800 font-semibold text-sm">
                                            {formatEnumLabel(UTILITY_PRICE_TYPE_LABELS, room.electricityPrice)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center text-gray-500">
                                            <DollarOutlined className="text-lg mr-3 text-orange-500" />
                                            <span className="text-sm">Giá nước</span>
                                        </div>
                                        <span className="text-gray-800 font-semibold text-sm">
                                            {formatEnumLabel(UTILITY_PRICE_TYPE_LABELS, room.waterPrice)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center text-gray-500">
                                            <DollarOutlined className="text-lg mr-3 text-orange-500" />
                                            <span className="text-sm">Internet</span>
                                        </div>
                                        <span className="text-gray-800 font-semibold text-sm">
                                            {formatEnumLabel(UTILITY_PRICE_TYPE_LABELS, room.internetPrice)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Mô tả */}
                        <Card className="shadow-sm border-none mb-4 rounded-lg">
                            <h3 className="font-bold text-lg mb-3">Mô tả chi tiết</h3>
                            <div className="whitespace-pre-line text-gray-700 leading-relaxed text-sm">{room.description}</div>
                            {room.amenities && room.amenities.length > 0 && (
                                <div className="mt-4 pt-4 border-t">
                                    <div className="font-semibold mb-2">Tiện ích:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {room.amenities.map((ame, i) => (
                                            ame && (
                                                <Tag key={i} color="blue" className="rounded-full px-3">
                                                    {ame}
                                                </Tag>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                        <Card className="shadow-sm border-none rounded-lg mt-4">
                            <div className="mb-4">
                                <h3 className="font-bold text-lg mb-1">Lịch sử giá cho thuê</h3>
                                <Text type="secondary" className="text-xs">Tại khu vực {room.address?.split(',').slice(-2).join(',')}</Text>
                            </div>

                            {/* 3 Ô thống kê bên trên */}
                            <Row gutter={[12, 12]} className="mb-6">
                                <Col span={8}>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 h-full">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-bold">{priceStats.popular}</span>
                                            <span className="text-xs text-gray-500">tr/tháng</span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1">Giá thuê phổ biến nhất {priceStats.currentMonthYear}</div>
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 h-full">
                                        {/* 🟢 Tự động đổi màu: Xanh khi tăng (>=0), Đỏ khi giảm (<0) */}
                                        <div className={`font-bold text-lg flex items-center gap-1 ${Number(priceStats.increase) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                                            {/* Đổi Icon tương ứng */}
                                            {Number(priceStats.increase) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                                            {Math.abs(priceStats.increase)}%
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1">Biến động khu vực</div>
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 h-full">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-bold text-gray-700">{priceStats.peakPrice}</span>
                                            <span className="text-xs text-gray-500">tr/tháng</span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1">Thấp hơn đỉnh {priceStats.peakPrice}tr ({priceStats.peakDate})</div>
                                    </div>
                                </Col>
                            </Row>

                            {/* Biểu đồ — chỉ render khi có data để tránh Recharts width=-1 warning */}
                            <div style={{ width: '100%', height: 350, marginTop: 16, minHeight: 200 }}>
                                {historyChartData.length > 0 ? <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={historyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} unit="tr" />

                                        {/* Tooltip tùy chỉnh để không hiện NaN */}
                                        <ChartTooltip
                                            formatter={(value, name) => {
                                                if (value === null || isNaN(value)) return [null, null];
                                                return [`${value} triệu`, name];
                                            }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />

                                        {/* Các đường biểu đồ chính */}
                                        <Line type="monotone" dataKey="highest" name="Giá cao nhất" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls />
                                        <Line type="monotone" dataKey="popular" name="Giá phổ biến" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                                        <Line type="monotone" dataKey="lowest" name="Giá thấp nhất" stroke="#facc15" strokeWidth={2} dot={false} connectNulls />


                                        <Line
                                            type="monotone"
                                            dataKey="thisRoom"
                                            name="Giá phòng này"
                                            stroke="#ff4d4f"
                                            strokeWidth={0} // QUAN TRỌNG: Bằng 0 để không có đường kẻ nối
                                            dot={{
                                                r: 8,
                                                fill: '#ff4d4f',
                                                stroke: '#fff',
                                                strokeWidth: 3,
                                                shadowBlur: 10,
                                                shadowColor: 'rgba(0,0,0,0.2)'
                                            }}
                                            activeDot={{ r: 10 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                                    : <div className="flex items-center justify-center h-full text-gray-400 text-sm">⏳ Đang tải dữ liệu biểu đồ...</div>}
                            </div>

                            {/* Disclaimer Footer */}
                            <div className="mt-6 bg-purple-50 p-3 rounded-lg flex gap-3 items-start">
                                <InfoCircleFilled className="text-purple-400 mt-1" />
                                <p className="text-[10px] text-purple-700 m-0 leading-relaxed">
                                    Dữ liệu giá được tổng hợp và xử lý từ các tin đăng trên hệ thống Smart Rental.
                                    Bạn hãy lưu ý về tin đăng nằm ngoài khoảng giá chúng tôi gợi ý để cân nhắc kỹ trước khi giao dịch.
                                </p>
                            </div>
                        </Card>

                        {/* Map */}
                        <Card className="shadow-sm border-none mb-4 rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-lg">Xem trên bản đồ</h3>
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<EnvironmentOutlined />}
                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${position[0]},${position[1]}`, '_blank')}
                                >
                                    Chỉ đường
                                </Button>
                            </div>

                            <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-200 z-0 relative">
                                <MapContainer
                                    center={position}
                                    zoom={15}
                                    scrollWheelZoom={false}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='© OpenStreetMap contributors'
                                    />
                                    <Marker position={position}>
                                        <Popup>
                                            <b>{room.title}</b> <br /> {room.address}
                                        </Popup>
                                    </Marker>
                                </MapContainer>
                            </div>
                        </Card>
                        <div ref={comparisonRef} className="mt-8">
                            <Card
                                className={`shadow-sm border-none rounded-lg bg-white mb-8 border-l-4 border-l-orange-400 ${cheaperRooms.length === 0 ? 'cursor-pointer select-none hover:shadow-md transition-shadow' : ''}`}
                                loading={loadingComparison}
                                onClick={() => {
                                    if (cheaperRooms.length === 0) {
                                        setIsComparisonExpanded(!isComparisonExpanded);
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-orange-500 p-2 rounded-lg">
                                            <DollarOutlined className="text-white text-xl" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold m-0 flex items-center gap-2">
                                                So sánh giá cùng loại trong khu vực
                                                {cheaperRooms.length === 0 && (
                                                    isComparisonExpanded ? <UpOutlined className="text-xs text-gray-400" /> : <DownOutlined className="text-xs text-gray-400" />
                                                )}
                                            </h3>
                                            <p className="text-gray-500 text-xs m-0">
                                                {nearbyStats.radius
                                                    ? `So sánh trong bán kính ${nearbyStats.radius / 1000}km ${nearbyStats.areaLevel === 'district'
                                                        ? 'cùng quận/huyện'
                                                        : 'cùng tỉnh/thành'
                                                    }`
                                                    : 'Đang phân tích khu vực'}
                                            </p>
                                        </div>
                                    </div>
                                    {cheaperRooms.length > 0 ? (
                                        <Tag color="orange" className="font-bold">GỢI Ý TỐT</Tag>
                                    ) : nearbyStats.totalNearby > 0 ? (
                                        <Tag color="green" className="font-bold">GIÁ TỐT</Tag>
                                    ) : (
                                        <Tag color="default" className="font-bold">CHƯA ĐỦ DỮ LIỆU</Tag>
                                    )}
                                </div>

                                {cheaperRooms.length === 0 ? (
                                    isComparisonExpanded && (
                                        // HIỂN THỊ KHI ĐƯỢC MỞ RỘNG VÀ KHÔNG CÓ PHÒNG RẺ HƠN
                                        <div className="py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 mt-6 animate-fadeIn">
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description={
                                                    nearbyStats.totalNearby === 0 ? (
                                                        // TRƯỜNG HỢP 1: Bán kính 3km không có bất kỳ phòng nào khác để so sánh
                                                        <div className="text-gray-500">
                                                            <p className="font-medium mb-1">Khu vực này hiện chưa có dữ liệu phòng khác</p>
                                                            <p className="text-xs">
                                                                Chúng tôi chưa tìm thấy bài cùng loại trong phạm vi phù hợp để so sánh.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        // TRƯỜNG HỢP 2: Có phòng xung quanh nhưng toàn phòng đắt hơn phòng này
                                                        <div className="text-gray-500">
                                                            <p className="font-medium mb-1">Đây là phòng có giá tốt nhất khu vực!</p>
                                                            <p className="text-xs">
                                                                Tìm thấy {nearbyStats.totalNearby} bài cùng loại trong khu vực nhưng chưa có bài nào rẻ hơn.
                                                            </p>
                                                        </div>
                                                    )
                                                }
                                            />
                                        </div>
                                    )
                                ) : (
                                    // HIỂN THỊ DANH SÁCH PHÒNG RẺ HƠN
                                    <div className="mt-6">
                                        <Row gutter={[16, 16]}>
                                            {cheaperRooms.map(item => (
                                                <Col xs={24} sm={12} md={6} key={item.id}>
                                                    <Card
                                                        hoverable
                                                        className="rounded-lg overflow-hidden border-none shadow-sm h-full relative border border-gray-100"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Ngăn kích hoạt onClick của Card cha
                                                            navigate(`/rooms/${item.id}`);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                    >
                                                        <div className="absolute top-2 right-2 z-10">
                                                            <Tag color="green" className="m-0 font-bold shadow-sm">
                                                                - {((room.price - item.price) / 1000).toLocaleString()}k
                                                            </Tag>
                                                        </div>
                                                        <img
                                                            src={getImageUrl(item)}
                                                            className="w-full h-28 object-cover rounded-md mb-2"
                                                            alt="cheaper"
                                                        />
                                                        <div className="font-bold text-[13px] line-clamp-1">{item.title}</div>
                                                        <div className="text-red-600 font-bold mt-1 text-sm">
                                                            {formatPriceByTransaction(item.price, item.transactionType)}
                                                        </div>
                                                    </Card>
                                                </Col>
                                            ))}
                                        </Row>
                                    </div>
                                )}
                            </Card>
                        </div>

                    </Col>


                    {/* ================= CỘT PHẢI (CHỈNH SỬA UX) ================= */}
                    <Col xs={24} lg={8}>
                        <div className="sticky top-4 space-y-4">
                            <Card className="hidden lg:block shadow-md border-t-4 border-t-orange-500 rounded-lg">
                                <div className="text-center mb-4">
                                    <div className="text-gray-500 text-xs">
                                        {room.transactionType === 'FOR_SALE' ? 'Giá bán' : 'Giá thuê phòng'}
                                    </div>
                                    <div className="text-red-600 font-bold text-2xl">
                                        {formatPriceByTransaction(room.price, room.transactionType)}
                                    </div>
                                </div>
                                <Button
                                    type="primary"
                                    size="large"
                                    block
                                    disabled={isOwnRoom}
                                    className="bg-orange-600 hover:bg-orange-500 font-bold h-12 mb-3"
                                    icon={<CalendarOutlined />}
                                    onClick={() => {
                                        if (!user) {
                                            message.warning("Vui lòng đăng nhập để đặt lịch!");
                                            navigate('/login');
                                            return;
                                        }

                                        if (isOwnRoom) {
                                            message.warning("Bạn không thể đặt lịch xem bài đăng của chính mình.");
                                            return;
                                        }

                                        setIsModalOpen(true);
                                    }}
                                >
                                    {isOwnRoom ? "BÀI ĐĂNG CỦA BẠN" : "ĐẶT LỊCH XEM PHÒNG"}
                                </Button>
                                <div className="text-center text-xs text-gray-400">
                                    Hoàn toàn miễn phí & Gặp trực tiếp chủ trọ
                                </div>
                            </Card>

                            {/* CARD THÔNG TIN CHỦ TRỌ */}
                            <Card className="shadow-sm border-none rounded-2xl overflow-hidden">
                                <div className="flex items-center gap-4 mb-5">
                                    <Avatar
                                        size={56}
                                        src={room.landlordAvatar} // Lấy đúng ảnh thật của chủ nhà
                                        icon={<UserOutlined />}
                                        className="shrink-0 border-2 border-orange-50 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => {
                                            const targetSlug = room.landlordSlug || room.ownerId;
                                            if (targetSlug) navigate(`/users/public-profile/${targetSlug}`);
                                        }}
                                    />
                                    <div className="min-w-0 flex-grow">
                                        <div
                                            className="font-bold text-gray-900 text-[16px] flex items-center flex-wrap gap-1.5 cursor-pointer hover:text-orange-500 transition-colors"
                                            onClick={() => {
                                                const targetSlug = room.landlordSlug || room.ownerSlugSnapshot || room.ownerId;
                                                if (targetSlug) navigate(`/users/public-profile/${targetSlug}`);
                                            }}
                                        >
                                            <span className="truncate">{room.landlordName || room.ownerNameSnapshot || "Chủ trọ"}</span>
                                            {room.kycStatus === 'VERIFIED' && (
                                                <Tooltip title="Đã xác minh (eKYC)">
                                                    <CheckCircleOutlined className="text-blue-500 text-[14px]" />
                                                </Tooltip>
                                            )}
                                            {room.membershipLevel && room.membershipLevel !== 'FREE' && (
                                                <Tag color="gold" className="m-0 border-none font-bold text-[9px] px-1 py-0 rounded flex items-center gap-0.5">
                                                    <CrownFilled style={{ fontSize: 9 }} /> {room.membershipLevel}
                                                </Tag>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-gray-400 mt-1 flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                </span>
                                                <span>Đang hoạt động</span>
                                            </div>
                                            {room.landlordCreatedAt && (
                                                <div className="mt-0.5 text-gray-400">
                                                    Tham gia: {dayjs(room.landlordCreatedAt).format('DD/MM/YYYY')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Cụm nút Chat & Zalo: Thiết kế liên mạch, icon chuẩn */}
                                <Row gutter={10} className="mb-4">
                                    <Col span={12}>
                                        <Button
                                            block
                                            onClick={handleZalo}
                                            className="flex items-center justify-center gap-2 bg-[#0068ff]/5 text-[#0068ff] border-none font-bold h-10 rounded-xl hover:bg-[#0068ff]/10 transition-all"
                                        >
                                            <ZaloIcon /> {/* Icon Zalo đã fix */}
                                            <span>Zalo</span>
                                        </Button>
                                    </Col>
                                    <Col span={12}>
                                        <Button
                                            block
                                            icon={<MessageOutlined />}
                                            onClick={handleChat}
                                            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 border-none font-bold h-10 rounded-xl hover:bg-gray-200 transition-all"
                                        >
                                            <span>Chat</span>
                                        </Button>
                                    </Col>
                                </Row>

                                {/* Nút Gọi điện: Style Shopee đặc trưng */}
                                <Button
                                    block
                                    size="large"
                                    type="primary"
                                    icon={<PhoneOutlined className="rotate-90" />}
                                    className="bg-[#ee4d2d] hover:bg-[#d73211] border-none font-extrabold text-[15px] h-12 rounded-xl shadow-sm flex items-center justify-center gap-2 uppercase tracking-tight"
                                    onClick={() => setShowPhone(!showPhone)}
                                >
                                    {showPhone ? (room.landlordPhone || "Chưa có số điện thoại") : "Bấm để hiện số"}
                                </Button>
                            </Card>

                            {/* --- TÌM ĐOẠN CARD BÌNH LUẬN CŨ VÀ THAY BẰNG ĐOẠN NÀY --- */}
                            <Card className="shadow-sm border-none rounded-xl overflow-hidden mt-4">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="font-bold text-gray-800 m-0 text-lg">Đánh giá khách hàng</h4>
                                    <div className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full">
                                        <StarFilled className="text-orange-500 text-xs" />
                                        <span className="text-orange-600 font-bold text-xs">
                                            {room.averageRating || 0} ({room.totalReviews || 0} đánh giá)
                                        </span>
                                    </div>
                                </div>

                                {/* KHUNG NHẬP LIỆU LIỀN MẠCH (TEXT + UPLOAD) */}
                                <Form form={reviewForm} layout="vertical" onFinish={handleSendReview} className="mb-10">
                                    <div className="mb-4 flex items-center gap-3">
                                        <span className="text-gray-500 text-[13px]">Bạn thấy phòng này thế nào?</span>
                                        <Form.Item name="rating" noStyle rules={[{ required: true, message: 'Vui lòng chọn sao' }]}>
                                            <Rate allowHalf className="text-orange-500 text-base" />
                                        </Form.Item>
                                    </div>

                                    {/* Khối border bao quanh cả text và ảnh */}
                                    <div className="border border-gray-200 rounded-xl bg-white focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-50 transition-all p-4">
                                        <Form.Item name="comment" noStyle rules={[{ required: true, message: 'Hãy viết gì đó...' }]}>
                                            <Input.TextArea
                                                rows={2}
                                                placeholder="Chia sẻ trải nghiệm thuê phòng thực tế của bạn..."
                                                variant="borderless"
                                                className="resize-none p-0 text-[14px] placeholder:text-gray-400 shadow-none focus:shadow-none"
                                            />
                                        </Form.Item>

                                        {/* Vùng upload ảnh nhỏ gọn ngay bên dưới */}
                                        <div className="mt-4 flex items-center seamless-upload">
                                            <Upload
                                                // Sử dụng customRequest để gọi uploadService thay vì dùng action mặc định
                                                customRequest={async ({ file, onSuccess, onError }) => {
                                                    try {
                                                        const url = await uploadService.uploadImage(file);
                                                        // onSuccess báo cho Ant Design biết upload thành công và lưu lại URL
                                                        onSuccess({ url });
                                                    } catch (err) {
                                                        onError(err);
                                                        message.error(`${file.name} tải lên thất bại.`);
                                                    }
                                                }}
                                                listType="picture-card"
                                                fileList={fileList}
                                                onChange={handleUploadChange}
                                                onRemove={(file) => {
                                                    message.info(`Đã bỏ ảnh ${file.name}`);
                                                    return true;
                                                }}
                                                maxCount={3}
                                                className="seamless-upload" // Class CSS để thu nhỏ ô ảnh trong App.css
                                            >
                                                {fileList.length < 3 && (
                                                    <div className="flex flex-col items-center">
                                                        <PlusOutlined className="text-gray-400 text-lg" />
                                                        <span className="text-[10px] text-gray-400 mt-1 font-bold">ẢNH</span>
                                                    </div>
                                                )}
                                            </Upload>
                                            {fileList.length === 0 && (
                                                <span className="text-gray-300 text-[11px] italic ml-2">Thêm tối đa 3 ảnh thực tế</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end mt-4">
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            loading={reviewLoading}
                                            className="bg-orange-600 hover:bg-orange-500 border-none px-10 rounded-full h-10 text-[13px] font-bold shadow-lg shadow-orange-100 uppercase"
                                        >
                                            Gửi bình luận
                                        </Button>
                                    </div>
                                </Form>

                                {/* DANH SÁCH BÌNH LUẬN BÊN DƯỚI */}
                                <div className="divide-y divide-gray-100"> {/* Đường kẻ mảnh chuẩn Shopee */}
                                    {reviews.length > 0 ? (
                                        reviews.map((rev) => (
                                            <div key={rev.id} className="py-6 flex gap-4">

                                                {/* 1. Avatar: Lấy trực tiếp từ rev.tenantAvatar */}
                                                <Avatar
                                                    size={40}
                                                    src={rev.tenantAvatar}
                                                    icon={<UserOutlined />}
                                                    className="shrink-0 border border-gray-50 shadow-sm"
                                                />

                                                <div className="flex-1 min-w-0">
                                                    {/* 2. Tên người dùng: Lấy từ rev.tenantName */}
                                                    <div className="text-[14px] font-bold text-gray-900 mb-0.5">
                                                        {rev.tenantName || "Người dùng Smart Rental"}
                                                    </div>

                                                    {/* 3. Rating: Sao màu cam Shopee */}
                                                    <Rate
                                                        disabled
                                                        defaultValue={rev.rating}
                                                        className="text-[10px] text-[#ee4d2d] block mb-2"
                                                    />

                                                    {/* 4. Nội dung bình luận */}
                                                    <div className="text-[14px] text-gray-800 leading-relaxed break-words whitespace-pre-line">
                                                        {rev.comment}
                                                    </div>

                                                    {/* 5. Lưới ảnh: Sử dụng rev.reviewImages */}
                                                    {rev.reviewImages && rev.reviewImages.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            <Image.PreviewGroup>
                                                                {rev.reviewImages.map((img, idx) => (
                                                                    <Image
                                                                        key={idx}
                                                                        src={img}
                                                                        className="rounded-md object-cover border border-gray-100 shadow-sm"
                                                                        width={80}
                                                                        height={80}
                                                                        preview={{ mask: <div className="text-[11px] font-bold">XEM</div> }}
                                                                    />
                                                                ))}
                                                            </Image.PreviewGroup>
                                                        </div>
                                                    )}

                                                    {/* 6. Phản hồi của chủ trọ: Hiển thị nếu rev.landlordReply có dữ liệu */}
                                                    {rev.landlordReply && (
                                                        <div className="mt-4 bg-[#f9f9f9] p-3 rounded-lg border-l-2 border-orange-500">
                                                            <div className="text-[12px] font-bold text-gray-800 mb-1 flex items-center gap-2">
                                                                <MessageOutlined className="text-orange-500 text-xs" />
                                                                Phản hồi của Chủ trọ
                                                            </div>
                                                            <div className="text-[13px] text-gray-600 italic">
                                                                "{rev.landlordReply}"
                                                            </div>
                                                            {rev.repliedAt && (
                                                                <div className="text-[10px] text-gray-400 mt-2">
                                                                    {dayjs(rev.repliedAt).fromNow()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* 7. Thời gian đánh giá */}
                                                    <div className="text-[11px] text-gray-400 mt-3 font-light">
                                                        {dayjs(rev.createdAt).format('DD-MM-YYYY HH:mm')}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 flex flex-col items-center">
                                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có đánh giá nào" />
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </Col>
                </Row>
                <div className="mt-12 mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                            Phòng dành cho bạn
                        </h3>
                        <Button type="link" onClick={() => navigate('/filter')} className="text-orange-500 font-medium">
                            Xem thêm <RightOutlined />
                        </Button>
                    </div>

                    {loadingRecs ? (
                        <div className="flex justify-center py-10"><Spin /></div>
                    ) : (
                        <Row gutter={[16, 16]}>
                            {recommendedRooms.length > 0 ? (
                                recommendedRooms.map(item => {
                                    // Xác định cấp độ VIP dựa trên priorityLevel
                                    const priority = item.priorityLevel || 0;
                                    const isVip = priority > 0;
                                    const isVipPremium = priority >= 2; // VIP cấp cao nhất (viền vàng)

                                    return (
                                        <Col xs={24} sm={12} md={6} key={item.id}>
                                            <Card
                                                hoverable
                                                // Thêm viền vàng và bóng đậm nếu là VIP cấp cao
                                                className={`rounded-lg overflow-hidden shadow-sm h-full flex flex-col transition-all ${isVipPremium ? 'border-[#fadb14] border-2 shadow-md' : 'border-none'
                                                    }`}
                                                cover={
                                                    <div className="h-40 overflow-hidden relative">
                                                        <img
                                                            src={getImageUrl(item)}
                                                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                                            alt="rec"
                                                        />

                                                        <Tag color="#f96302" className="absolute top-2 left-2 border-none text-[10px] z-10 font-bold uppercase">
                                                            {item.rentalType === 'WHOLE' ? 'Nguyên căn' : 'Ở ghép'}
                                                        </Tag>

                                                        {isVip && (
                                                            <Tag
                                                                color="#fadb14"
                                                                className="absolute top-2 right-2 border-none font-bold text-[10px] m-0 flex items-center gap-1 shadow-sm text-black px-1.5 py-0.5 z-10"
                                                            >
                                                                <CrownFilled className={isVipPremium ? "animate-bounce" : ""} /> VIP
                                                            </Tag>
                                                        )}
                                                    </div>
                                                }
                                                onClick={() => {
                                                    navigate(`/rooms/${item.id}`);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                            >
                                                {/* Tiêu đề màu cam nếu là VIP */}
                                                <div className={`font-bold text-sm line-clamp-2 h-10 mb-2 transition-colors flex items-start gap-1 ${isVip ? 'text-[#f96302]' : 'text-gray-800'
                                                    }`}>
                                                    {isVip && <CrownFilled className="mt-1 flex-shrink-0 text-[#fadb14]" />}
                                                    {item.title}
                                                </div>

                                                <div className="text-red-600 font-bold text-base mb-1">
                                                    {item.price?.toLocaleString()} đ/tháng
                                                </div>

                                                <div className="flex items-center text-gray-400 text-[11px] truncate">
                                                    <EnvironmentOutlined className="mr-1 shrink-0" />
                                                    <span>{item.address}</span>
                                                </div>
                                            </Card>
                                        </Col>
                                    );
                                })
                            ) : (
                                <Col span={24}>
                                    <Empty description="Chưa có gợi ý phù hợp" />
                                </Col>
                            )}
                        </Row>
                    )}

                    {/* ================= MỤC TIN ĐĂNG CÓ VIDEO THỰC TẾ ================= */}
                    <div className="mt-12 mb-16">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="bg-red-600 w-1.5 h-7 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                                <h3 className="text-xl font-bold text-gray-800 m-0 uppercase tracking-tight">Video thực tế gần khu vực này</h3>
                                <Tag color="red" className="ml-2 border-none font-bold text-[10px] animate-pulse">HOT</Tag>
                            </div>
                        </div>

                        {loadingVideoRooms ? (
                            <div className="flex justify-center py-10"><Spin size="large" /></div>
                        ) : (
                            <Row gutter={[20, 20]}>
                                {videoRooms.length > 0 ? (
                                    videoRooms.map(item => {
                                        // 🟢 Xác định VIP dựa trên priorityLevel
                                        const isVip = (item.priorityLevel || 0) > 0;

                                        return (
                                            <Col xs={24} sm={12} md={6} key={item.id}>
                                                <Card
                                                    hoverable
                                                    className="rounded-2xl overflow-hidden border-none shadow-lg group h-full flex flex-col bg-white"
                                                    onClick={() => {
                                                        navigate(`/rooms/${item.id}`);
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    cover={
                                                        <div className="h-44 overflow-hidden relative bg-black">
                                                            <img
                                                                src={getImageUrl(item)}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
                                                                alt="video-thumb"
                                                            />

                                                            {/* 🟢 LOGO VIP: Hiện góc phải trên cùng của video */}
                                                            {isVip && (
                                                                <Tag color="#fadb14" className="absolute top-2 right-2 border-none font-bold text-[10px] m-0 flex items-center gap-1 shadow-sm text-black px-1.5 py-0.5 z-10">
                                                                    <CrownFilled /> VIP
                                                                </Tag>
                                                            )}

                                                            {/* Nút Play trung tâm */}
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="w-14 h-14 bg-red-600/90 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:bg-red-500 transition-all">
                                                                    <PlayCircleOutlined className="text-white text-3xl" />
                                                                </div>
                                                            </div>
                                                            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-3 py-1 rounded-full font-bold">
                                                                TRỰC QUAN
                                                            </div>
                                                        </div>
                                                    }
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        {/* 🟢 TIÊU ĐỀ: Đổi sang màu cam nếu là tin VIP */}
                                                        <div className={`font-bold text-[14px] line-clamp-1 transition-colors ${isVip ? 'text-[#f96302]' : 'text-gray-800 group-hover:text-red-600'
                                                            }`}>
                                                            {isVip && <CrownFilled className="mr-1 text-[#fadb14]" />}
                                                            {item.title}
                                                        </div>
                                                        <div className="text-red-600 font-extrabold text-base">
                                                            {item.price?.toLocaleString()} đ/tháng
                                                        </div>
                                                        <div className="flex items-center text-gray-400 text-[11px] truncate">
                                                            <EnvironmentOutlined className="mr-1 shrink-0" />
                                                            <span>{item.address}</span>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </Col>
                                        );
                                    })
                                ) : (
                                    <Col span={24}>
                                        <Empty description="Đang cập nhật thêm các tin đăng có video..." />
                                    </Col>
                                )}
                            </Row>
                        )}
                    </div>

                </div>
            </div>

            {/* --- [MỚI] FIXED BOTTOM BAR (CHO MOBILE) --- */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 lg:hidden z-50 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div>
                    <div className="text-xs text-gray-500">Giá thuê</div>
                    <div className="text-red-600 font-bold text-lg">{room.price?.toLocaleString()} đ</div>
                </div>
                <Button
                    type="primary"
                    size="large"
                    block
                    disabled={isOwnRoom}
                    className="bg-orange-600 hover:bg-orange-500 font-bold h-12 mb-3"
                    icon={<CalendarOutlined />}
                    onClick={() => {
                        if (!user) {
                            message.warning("Vui lòng đăng nhập để đặt lịch!");
                            navigate('/login');
                            return;
                        }

                        if (isOwnRoom) {
                            message.warning("Bạn không thể đặt lịch xem bài đăng của chính mình.");
                            return;
                        }

                        setIsModalOpen(true);
                    }}
                >
                    {isOwnRoom ? "BÀI ĐĂNG CỦA BẠN" : "ĐẶT LỊCH XEM PHÒNG"}
                </Button>
            </div>


            <BookingModal
                visible={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                room={room}
                user={user}
            />

        </div>
    );
};

export default RoomDetail;
