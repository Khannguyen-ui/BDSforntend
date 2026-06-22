import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Tabs, Empty, Spin, Card, Tag, Button, Pagination,
    Typography, message, Tooltip, Badge
} from 'antd';
import {
    HeartFilled, HeartOutlined,
    BookOutlined, BookFilled,
    EnvironmentOutlined, ColumnWidthOutlined,
    DollarOutlined, EyeOutlined, DeleteOutlined,
    HomeOutlined, FireOutlined
} from '@ant-design/icons';
import favoriteService from '../../services/favoriteService';
import useAuth from '../../hooks/useAuth';
import { getImageUrl } from '../../utils/imageHelper';

const { Title, Text } = Typography;

// ─── Hàm format giá tiền ────────────────────────────────────────────
const formatPrice = (price) => {
    if (!price) return 'Thỏa thuận';
    if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
    if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu/tháng`;
    return `${price?.toLocaleString('vi-VN')} đ/tháng`;
};

// ─── Component Card bất động sản ─────────────────────────────────────
const PropertyCard = ({ property, type, onRemove, removing }) => {
    const navigate = useNavigate();
    const imageUrl = property.thumbnailUrl || property.images?.[0] || property.imageUrl || null;

    return (
        <div
            className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-orange-200"
            style={{ transform: 'translateY(0)', transition: 'all 0.3s ease' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
            {/* Ảnh thumbnail */}
            <div className="relative h-48 overflow-hidden bg-gray-100">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                        <HomeOutlined style={{ fontSize: 48, color: '#f97316', opacity: 0.4 }} />
                    </div>
                )}

                {/* Badge góc trái */}
                <div className="absolute top-3 left-3 flex gap-1 flex-wrap">
                    {property.transactionType && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${property.transactionType === 'RENT' ? 'bg-blue-500' : 'bg-green-500'}`}>
                            {property.transactionType === 'RENT' ? 'Cho thuê' : 'Bán'}
                        </span>
                    )}
                    {property.priorityLevel > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center gap-1">
                            <FireOutlined /> VIP
                        </span>
                    )}
                </div>

                {/* Nút xoá góc phải */}
                <Tooltip title={type === 'liked' ? 'Bỏ thích' : 'Bỏ lưu'}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(property.propertyId || property.id); }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-50 border border-gray-200"
                        disabled={removing}
                    >
                        {removing ? (
                            <Spin size="small" />
                        ) : type === 'liked' ? (
                            <HeartFilled style={{ color: '#ef4444', fontSize: 14 }} />
                        ) : (
                            <BookFilled style={{ color: '#3b82f6', fontSize: 14 }} />
                        )}
                    </button>
                </Tooltip>
            </div>

            {/* Nội dung card */}
            <div
                className="p-4"
                onClick={() => navigate(`/rooms/${property.propertyId || property.id}`)}
            >
                <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-orange-500 transition-colors">
                    {property.title || 'Bất động sản'}
                </h3>

                {/* Giá */}
                <div className="flex items-center gap-1 mb-2">
                    <DollarOutlined style={{ color: '#f97316', fontSize: 13 }} />
                    <span className="text-orange-500 font-bold text-base">
                        {formatPrice(property.price)}
                    </span>
                </div>

                {/* Địa chỉ */}
                {(property.address || property.district || property.province) && (
                    <div className="flex items-start gap-1 text-gray-400 text-xs mb-2">
                        <EnvironmentOutlined style={{ marginTop: 2 }} />
                        <span className="line-clamp-1">
                            {[property.district, property.province].filter(Boolean).join(', ') || property.address}
                        </span>
                    </div>
                )}

                {/* Diện tích */}
                {property.area && (
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <ColumnWidthOutlined />
                        <span>{property.area} m²</span>
                    </div>
                )}

                {/* Nút xem chi tiết */}
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/rooms/${property.propertyId || property.id}`); }}
                    className="mt-3 w-full py-1.5 rounded-lg text-xs font-medium text-orange-500 border border-orange-200 bg-orange-50 hover:bg-orange-500 hover:text-white transition-colors flex items-center justify-center gap-1"
                >
                    <EyeOutlined /> Xem chi tiết
                </button>
            </div>
        </div>
    );
};

// ─── Component danh sách (có phân trang) ────────────────────────────────────
const PropertyList = ({ items, loading, type, onRemove, removingId, page, setPage, total, hasError, onRetry }) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Spin size="large" />
                <p className="text-gray-400 text-sm animate-pulse">Đang tải danh sách...</p>
            </div>
        );
    }

    // Hiển thị lỗi backend với nút thử lại thay vì spam toast
    if (hasError) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                    <span style={{ fontSize: 36 }}>⚠️</span>
                </div>
                <div className="text-center">
                    <p className="text-gray-700 font-medium text-base mb-1">Không thể tải dữ liệu</p>
                    <p className="text-gray-400 text-sm">Máy chủ đang gặp sự cố. Vui lòng thử lại sau.</p>
                </div>
                <Button
                    type="primary"
                    onClick={onRetry}
                    style={{ background: '#f97316', borderColor: '#f97316' }}
                >
                    🔄 Thử lại
                </Button>
            </div>
        );
    }

    if (!items || items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                    {type === 'liked'
                        ? <HeartOutlined style={{ fontSize: 40, color: '#f97316' }} />
                        : <BookOutlined style={{ fontSize: 40, color: '#3b82f6' }} />
                    }
                </div>
                <p className="text-gray-500 text-base font-medium">
                    {type === 'liked' ? 'Bạn chưa thích bất động sản nào' : 'Bạn chưa lưu bất động sản nào'}
                </p>
                <p className="text-gray-400 text-sm">
                    {type === 'liked' ? 'Nhấn ❤️ trên trang chi tiết để thêm vào đây' : 'Nhấn 📌 trên trang chi tiết để lưu lại'}
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {items.map((item) => (
                    <PropertyCard
                        key={item.propertyId || item.id}
                        property={item}
                        type={type}
                        onRemove={onRemove}
                        removing={removingId === (item.propertyId || item.id)}
                    />
                ))}
            </div>

            {total > 12 && (
                <div className="flex justify-center mt-8">
                    <Pagination
                        current={page + 1}
                        pageSize={12}
                        total={total}
                        onChange={(p) => setPage(p - 1)}
                        showSizeChanger={false}
                    />
                </div>
            )}
        </>
    );
};

// ─── TRANG CHÍNH ─────────────────────────────────────────────────────
const MyFavorites = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State tab liked
    const [likedItems, setLikedItems] = useState([]);
    const [likedLoading, setLikedLoading] = useState(false);
    const [likedPage, setLikedPage] = useState(0);
    const [likedTotal, setLikedTotal] = useState(0);
    const [likedError, setLikedError] = useState(false);

    // State tab saved
    const [savedItems, setSavedItems] = useState([]);
    const [savedLoading, setSavedLoading] = useState(false);
    const [savedPage, setSavedPage] = useState(0);
    const [savedTotal, setSavedTotal] = useState(0);
    const [savedError, setSavedError] = useState(false);

    // State xoá
    const [removingId, setRemovingId] = useState(null);

    // ── Fetch liked ──────────────────────────────────────────────────
    const fetchLiked = useCallback(async (pg = 0) => {
        setLikedLoading(true);
        setLikedError(false);
        try {
            const res = await favoriteService.getMyLikedProperties(pg, 12);
            const data = res.data?.content || res.data?.result?.content || res.data || [];
            const total = res.data?.totalElements || res.data?.result?.totalElements || (Array.isArray(data) ? data.length : 0);
            setLikedItems(Array.isArray(data) ? data : []);
            setLikedTotal(total);
        } catch (err) {
            // Không spam toast — chỉ log và set error state
            console.warn('[MyFavorites] getMyLikedProperties error:', err?.response?.status, err?.message);
            setLikedError(true);
            setLikedItems([]);
        } finally {
            setLikedLoading(false);
        }
    }, []);

    // ── Fetch saved ──────────────────────────────────────────────────
    const fetchSaved = useCallback(async (pg = 0) => {
        setSavedLoading(true);
        setSavedError(false);
        try {
            const res = await favoriteService.getMySavedProperties(pg, 12);
            const data = res.data?.content || res.data?.result?.content || res.data || [];
            const total = res.data?.totalElements || res.data?.result?.totalElements || (Array.isArray(data) ? data.length : 0);
            setSavedItems(Array.isArray(data) ? data : []);
            setSavedTotal(total);
        } catch (err) {
            // Không spam toast — chỉ log và set error state
            console.warn('[MyFavorites] getMySavedProperties error:', err?.response?.status, err?.message);
            setSavedError(true);
            setSavedItems([]);
        } finally {
            setSavedLoading(false);
        }
    }, []);

    // ── Load lần đầu — chỉ chạy 1 lần khi user thay đổi ────────────
    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchLiked(0);
        fetchSaved(0);
    }, [user, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Xoá khỏi liked ───────────────────────────────────────────────
    const handleRemoveLiked = async (propertyId) => {
        setRemovingId(propertyId);
        try {
            await favoriteService.toggleLike(propertyId);
            message.success('Đã bỏ thích');
            fetchLiked(likedPage);
        } catch {
            message.error('Thao tác thất bại');
        } finally {
            setRemovingId(null);
        }
    };

    // ── Xoá khỏi saved ───────────────────────────────────────────────
    const handleRemoveSaved = async (propertyId) => {
        setRemovingId(propertyId);
        try {
            await favoriteService.toggleSave(propertyId);
            message.success('Đã bỏ lưu');
            fetchSaved(savedPage);
        } catch {
            message.error('Thao tác thất bại');
        } finally {
            setRemovingId(null);
        }
    };

    const tabItems = [
        {
            key: 'liked',
            label: (
                <span className="flex items-center gap-2 font-medium">
                    <HeartFilled style={{ color: '#ef4444' }} />
                    Đã thích
                    <Badge
                        count={likedTotal}
                        overflowCount={99}
                        style={{ backgroundColor: '#ef4444' }}
                    />
                </span>
            ),
            children: (
                <PropertyList
                    items={likedItems}
                    loading={likedLoading}
                    type="liked"
                    onRemove={handleRemoveLiked}
                    removingId={removingId}
                    page={likedPage}
                    setPage={(pg) => { setLikedPage(pg); fetchLiked(pg); }}
                    total={likedTotal}
                    hasError={likedError}
                    onRetry={() => fetchLiked(likedPage)}
                />
            )
        },
        {
            key: 'saved',
            label: (
                <span className="flex items-center gap-2 font-medium">
                    <BookFilled style={{ color: '#3b82f6' }} />
                    Đã lưu
                    <Badge
                        count={savedTotal}
                        overflowCount={99}
                        style={{ backgroundColor: '#3b82f6' }}
                    />
                </span>
            ),
            children: (
                <PropertyList
                    items={savedItems}
                    loading={savedLoading}
                    type="saved"
                    onRemove={handleRemoveSaved}
                    removingId={removingId}
                    page={savedPage}
                    setPage={(pg) => { setSavedPage(pg); fetchSaved(pg); }}
                    total={savedTotal}
                    hasError={savedError}
                    onRetry={() => fetchSaved(savedPage)}
                />
            )
        }
    ];

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fff 60%, #eff6ff 100%)' }}>
            {/* ── HEADER ─────────────────────────────────────────────── */}
            <div
                className="relative overflow-hidden mb-8"
                style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #fb923c 40%, #fdba74 100%)',
                    padding: '40px 0 60px',
                }}
            >
                {/* Vòng tròn trang trí */}
                <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full opacity-10 bg-white" />
                <div className="absolute -bottom-20 -left-10 w-80 h-80 rounded-full opacity-10 bg-white" />

                <div className="max-w-6xl mx-auto px-6 relative z-10">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-orange-100 text-sm mb-4">
                        <span
                            className="cursor-pointer hover:text-white transition-colors"
                            onClick={() => navigate('/')}
                        >
                            Trang chủ
                        </span>
                        <span>/</span>
                        <span className="text-white font-medium">Danh sách yêu thích</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                            <HeartFilled style={{ fontSize: 28, color: 'white' }} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1">
                                Danh sách yêu thích
                            </h1>
                            <p className="text-orange-100 text-sm">
                                Quản lý các bất động sản bạn đã thích và đã lưu
                            </p>
                        </div>
                    </div>

                    {/* Stats bar */}
                    <div className="flex gap-6 mt-6">
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
                            <HeartFilled style={{ color: '#fca5a5' }} />
                            <span className="text-white font-semibold">{likedTotal}</span>
                            <span className="text-orange-100 text-sm">tin đã thích</span>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
                            <BookFilled style={{ color: '#93c5fd' }} />
                            <span className="text-white font-semibold">{savedTotal}</span>
                            <span className="text-orange-100 text-sm">tin đã lưu</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── NỘI DUNG CHÍNH ──────────────────────────────────────── */}
            <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10 pb-12">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <Tabs
                        defaultActiveKey="liked"
                        items={tabItems}
                        size="large"
                        style={{ padding: '0 24px' }}
                        tabBarStyle={{
                            borderBottom: '2px solid #f3f4f6',
                            marginBottom: 24,
                            paddingTop: 16,
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default MyFavorites;
