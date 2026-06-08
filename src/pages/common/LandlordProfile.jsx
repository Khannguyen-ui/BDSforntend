import React, { useEffect, useState } from 'react';
import { getImageUrl } from '../../utils/imageHelper';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Avatar, Button, Card, Col, Row, Tag, Typography,
  Spin, Statistic, Empty, Rate, Breadcrumb, Tooltip, message,
  Pagination
} from 'antd';
import {
  UserOutlined, PhoneOutlined,
  EnvironmentOutlined, ClockCircleOutlined, HeartOutlined,
  SafetyCertificateFilled, HomeOutlined, CheckCircleFilled,
  CameraFilled, IdcardFilled, CrownFilled, FireFilled
} from '@ant-design/icons';
import { Select } from 'antd';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import userService from '../../services/userService';
import roomService from '../../services/roomService';
import { formatCurrency } from '../../utils/format';
import useAuth from '../../hooks/useAuth'; // ✅ THÊM USE AUTH
import chatService from '../../services/chatService';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text } = Typography;

const LandlordProfile = () => {
  const { user: currentUser } = useAuth();
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [bannerUrl, setBannerUrl] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState('newest');

  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'FOR_RENT', 'FOR_SALE'
  const pageSize = 8;

  // 1. Tải Profile và Banner công khai khi slug thay đổi
  useEffect(() => {
    const fetchProfileAndBanner = async () => {
      setLoading(true);
      try {
        // Lấy profile bằng slug
        const profileRes = await userService.getLandlordPublicProfile(slug);
        const profileData = profileRes.data?.result || profileRes.data;
        setProfile(profileData);

        // Lấy banner công khai từ API mới
        try {
          const bannerRes = await userService.getLandlordPublicBanner(slug);
          const bannerData = bannerRes.data?.result || bannerRes.data;
          setBannerUrl(bannerData?.bannerUrl || null);
        } catch (bannerErr) {
          console.warn("Lỗi tải banner, dùng banner mặc định:", bannerErr);
          setBannerUrl(null);
        }
      } catch (error) {
        console.error("Lỗi tải profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProfileAndBanner();
      setCurrentPage(1);
      setActiveTab('ALL');
    }
  }, [slug]);

  // 2. Tải danh sách bài viết (rooms) phân trang khi profile, currentPage hoặc activeTab thay đổi
  useEffect(() => {
    const fetchOwnerRooms = async () => {
      const ownerId = profile?.id || profile?.publicId;
      if (!ownerId) return;

      try {
        const pageParam = currentPage - 1;
        const transactionTypeParam = activeTab === 'ALL' ? null : activeTab;

        const resRooms = await roomService.getRoomsByLandlord(ownerId, pageParam, pageSize, transactionTypeParam);

        // Trích xuất dữ liệu cực kỳ linh hoạt
        const resData = resRooms.data;
        const resultObj = resData?.result || resData?.data || resData;

        let contentArray = [];
        let totalElements = 0;

        if (Array.isArray(resultObj)) {
          contentArray = resultObj;
          totalElements = resultObj.length;
        } else if (resultObj) {
          contentArray = resultObj.content || [];
          totalElements = resultObj.totalElements ?? contentArray.length;
        }

        setRooms(contentArray);
        setTotalRooms(totalElements);
      } catch (error) {
        console.error("Lỗi tải bài viết:", error);
      }
    };

    fetchOwnerRooms();
  }, [profile, currentPage, activeTab]);

  // Reset trang về 1 khi người dùng đổi tab lọc hoặc đổi sắp xếp
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, sortType]);
  // --- HÀM XỬ LÝ NHẮN TIN ---
  const handleStartChat = async () => {
    // 1. Kiểm tra đăng nhập
    if (!currentUser) {
      message.warning("Vui lòng đăng nhập để nhắn tin!");
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    // 2. Kiểm tra có phải chính mình không
    if (currentUser.id === profile?.id) {
      message.info("Đây là trang cá nhân của bạn.");
      return;
    }

    // 3. Gửi tin nhắn text (không phải property card)
    try {
      message.loading({ content: "Đang kết nối...", key: 'chat_loading' });

      // Tạo hội thoại
      await chatService.startConversation(profile.id);

      // ✅ GỬI TEXT THƯỜNG - THAY ĐỔI DÒNG NÀY
      await chatService.sendMessage(profile.id, "Xin chào! Tôi muốn liên hệ với bạn.", 'TEXT');

      message.success({ content: "Đã kết nối!", key: 'chat_loading' });

      // 4. Chuyển sang Messages
      navigate('/messages', { state: { openPartnerId: profile.id } });
    } catch (error) {
      console.error(error);
      message.error({ content: "Lỗi kết nối server chat.", key: 'chat_loading' });
    }
  };

  const getLastActiveText = (dateString) => {
    if (!dateString) return "Chưa hoạt động";
    const lastActive = dayjs(dateString);
    const diffMins = dayjs().diff(lastActive, 'minute');

    if (diffMins < 5) return <span className="text-green-600 font-bold">● Đang hoạt động</span>;
    if (diffMins < 60) return `Online ${diffMins} phút trước`;
    return `Online ${lastActive.fromNow()}`;
  };

  const isRented = (room) => {
    if (room.status === 'FULL') return true;
    if (room.rentalType === 'WHOLE' && (room.currentTenants > 0)) return true;
    return false;
  };

  const getSortedRooms = () => {
    let sorted = [...rooms];

    if (sortType === 'newest') {
      // 🟢 LOGIC MỚI: Ưu tiên VIP (Priority cao) -> Sau đó mới đến Ngày tạo
      sorted.sort((a, b) => {
        const priorityA = a.priorityLevel || 0;
        const priorityB = b.priorityLevel || 0;

        // Nếu khác độ ưu tiên, đưa VIP lên trước
        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }
        // Nếu cùng độ ưu tiên, tin mới hơn lên trước
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

    } else if (sortType === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortType === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price);
    }
    return sorted;
  };

  if (loading) return <div className="flex h-screen justify-center items-center"><Spin size="large" /></div>;
  if (!profile) return <div className="text-center mt-10">Không tìm thấy người dùng</div>;

  const isOwnProfile = currentUser?.id === profile?.id;
  const isVerified = profile.isIdentityVerified === true || profile.identityVerified === true;
  const isOnline = dayjs().diff(dayjs(profile.lastActiveAt), 'minute') < 5;

  return (
    <div className="bg-[#f0f2f5] min-h-screen pb-10 font-sans">

      {/* 1. BREADCRUMB */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
        <Breadcrumb
          items={[
            { title: <Link to="/"><HomeOutlined /> Trang chủ</Link> },
            { title: <Link to="/search">Tìm phòng</Link> },
            { title: <span className="text-gray-800 font-medium">Hồ sơ: {profile.fullName}</span> },
          ]}
        />
      </div>

      {/* 2. HEADER PROFILE - UI nâng cấp */}
      <div className="max-w-6xl mx-auto px-4 mt-2">
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] border border-white">

          {/* Banner */}
          <div
            className="relative h-[280px] w-full bg-cover bg-center"
            style={{
              backgroundImage: `url('${bannerUrl || profile.bannerUrl || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop"}')`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10"></div>

            {/* Badge trên banner */}
            <div className="absolute top-5 left-5 flex flex-wrap items-center gap-2">
              {isVerified && (
                <Tag className="m-0 rounded-full border-none bg-blue-500/90 text-white font-bold px-3 py-1 shadow-lg" icon={<IdcardFilled />}>
                  Đã xác minh eKYC
                </Tag>
              )}

              {profile.successfulDeals >= 5 && (
                <Tag className="m-0 rounded-full border-none bg-yellow-400 text-black font-bold px-3 py-1 shadow-lg" icon={<CrownFilled />}>
                  Chủ trọ uy tín
                </Tag>
              )}

              {isOnline && (
                <Tag className="m-0 rounded-full border-none bg-green-500/90 text-white font-bold px-3 py-1 shadow-lg">
                  ● Đang hoạt động
                </Tag>
              )}
            </div>

            {/* Tên nổi trên banner mobile */}
            <div className="absolute bottom-6 left-6 right-6 md:hidden text-white">
              <h1 className="text-2xl font-extrabold m-0 drop-shadow-lg">{profile.fullName}</h1>
              <div className="text-white/80 text-sm mt-1">
                Tham gia {dayjs(profile.joinDate).format('DD/MM/YYYY')}
              </div>
            </div>
          </div>

          {/* Info chính */}
          <div className="relative px-6 md:px-8 pb-8">
            <div className="flex flex-col lg:flex-row lg:items-end gap-6 -mt-20">

              {/* Avatar */}
              <div className="relative shrink-0 mx-auto lg:mx-0">
                <div className="relative rounded-full p-1.5 bg-white shadow-2xl">
                  <Avatar
                    size={150}
                    src={profile.avatarUrl}
                    icon={<UserOutlined />}
                    className="border-4 border-orange-100 bg-white object-cover"
                  />
                </div>

                {isVerified && (
                  <Tooltip title="Tài khoản đã xác minh danh tính">
                    <div className="absolute bottom-4 right-2 z-30 bg-white rounded-full p-1 shadow-md">
                      <CheckCircleFilled className="text-blue-500 text-3xl" />
                    </div>
                  </Tooltip>
                )}

                {isOnline && (
                  <Tooltip title="Đang hoạt động">
                    <div className="absolute bottom-5 left-4 bg-green-500 border-4 border-white w-6 h-6 rounded-full shadow-md"></div>
                  </Tooltip>
                )}
              </div>

              {/* Tên + mô tả */}
              <div className="flex-1 text-center lg:text-left pt-2">
                <div className="hidden md:flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                  <Title level={2} style={{ margin: 0 }} className="!text-gray-900">
                    {profile.fullName}
                  </Title>

                  {isVerified && (
                    <Tooltip title="Đã xác minh">
                      <CheckCircleFilled className="text-blue-500 text-2xl" />
                    </Tooltip>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  <Tag color="orange" className="rounded-full px-3 py-1 font-semibold border-none">
                    Chủ trọ
                  </Tag>

                  {profile.successfulDeals >= 5 && (
                    <Tag color="gold" icon={<CrownFilled />} className="rounded-full px-3 py-1 font-semibold border-none">
                      Uy tín
                    </Tag>
                  )}

                  {isVerified && (
                    <Tag color="blue" icon={<IdcardFilled />} className="rounded-full px-3 py-1 font-semibold border-none">
                      eKYC
                    </Tag>
                  )}
                </div>

                <div className="mt-3 text-gray-500 flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-1 text-sm">
                  <span className="flex items-center gap-1">
                    <ClockCircleOutlined />
                    {getLastActiveText(profile.lastActiveAt)}
                  </span>
                  <span className="hidden md:inline text-gray-300">|</span>
                  <span>Tham gia: {dayjs(profile.joinDate).format('DD/MM/YYYY')}</span>
                </div>

                <div className="mt-4 flex flex-wrap justify-center lg:justify-start gap-2">
                  {profile.activeDistricts && profile.activeDistricts.length > 0 ? (
                    profile.activeDistricts.slice(0, 4).map((d, i) => (
                      <Tag key={i} color="geekblue" className="m-0 rounded-full px-3 py-1 border-none bg-blue-50 text-blue-600 font-medium">
                        <EnvironmentOutlined /> {d}
                      </Tag>
                    ))
                  ) : (
                    <Tag className="m-0 rounded-full px-3 py-1 border-none bg-gray-100 text-gray-500 font-medium">
                      <EnvironmentOutlined /> Toàn quốc
                    </Tag>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 justify-center lg:justify-end pb-1">
                {!isOwnProfile && (
                  <Button
                    size="large"
                    className="h-12 px-7 rounded-full border-gray-200 font-bold shadow-sm hover:border-[#f96302] hover:text-[#f96302]"
                    onClick={handleStartChat}
                  >
                    Nhắn tin
                  </Button>
                )}

                <Button
                  type="primary"
                  size="large"
                  icon={<PhoneOutlined />}
                  className="h-12 px-8 rounded-full bg-[#f96302] hover:bg-orange-600 border-none font-extrabold shadow-lg shadow-orange-200"
                >
                  Liên hệ
                </Button>
              </div>
            </div>

            {/* Stats đẹp hơn */}
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-white border border-orange-100 p-4 shadow-sm">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-100 rounded-full"></div>
                <div className="text-xs uppercase font-extrabold text-gray-500 mb-2">Đánh giá</div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-[#f96302]">{Number(profile.averageRating || 0).toFixed(1)}</span>
                  <span className="text-gray-400 pb-1">/5</span>
                </div>
                <Rate disabled value={1} count={1} className="text-[#f96302] text-sm mt-1" />
                <div className="text-xs text-gray-400 mt-1">{profile.totalReviews || 0} lượt đánh giá</div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-white border border-green-100 p-4 shadow-sm">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-100 rounded-full"></div>
                <div className="text-xs uppercase font-extrabold text-gray-500 mb-2">Giao dịch</div>
                <div className="flex items-center gap-2">
                  <SafetyCertificateFilled className="text-green-600 text-2xl" />
                  <span className="text-3xl font-black text-green-600">{profile.successfulDeals || 0}</span>
                </div>
                <div className="text-xs text-gray-400 mt-2">Hợp đồng thành công</div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-4 shadow-sm">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-100 rounded-full"></div>
                <div className="text-xs uppercase font-extrabold text-gray-500 mb-2">Tin đăng</div>
                <div className="flex items-center gap-2">
                  <HomeOutlined className="text-blue-600 text-2xl" />
                  <span className="text-3xl font-black text-blue-600">{totalRooms}</span>
                </div>
                <div className="text-xs text-gray-400 mt-2">Đang công khai trên hệ thống</div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 p-4 shadow-sm">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-100 rounded-full"></div>
                <div className="text-xs uppercase font-extrabold text-gray-500 mb-2">Khu vực</div>
                <div className="flex flex-wrap gap-1 min-h-[36px] items-center">
                  {profile.activeDistricts && profile.activeDistricts.length > 0 ? (
                    profile.activeDistricts.slice(0, 2).map((d, i) => (
                      <Tag key={i} className="m-0 rounded-full border-none bg-purple-100 text-purple-700 font-bold">
                        {d}
                      </Tag>
                    ))
                  ) : (
                    <span className="text-2xl font-black text-purple-600">Toàn quốc</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-2">Khu vực hoạt động chính</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BODY: DANH SÁCH TIN ĐĂNG */}
      <div className="max-w-6xl mx-auto px-4 mt-8">

        <div className="flex items-center justify-between mb-4" id="room-section-title">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800 m-0 border-l-4 border-[#f96302] pl-3">
              Tin đăng của {profile.fullName}
            </h2>
            <Tag color="#f96302" className="rounded-full px-2">{totalRooms}</Tag>
          </div>
        </div>

        {/* TABS LỌC TIN ĐĂNG (TẤT CẢ / CHO THUÊ / BÁN) */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <Button
              className={`rounded-full font-bold transition-all px-5 ${activeTab === 'ALL' ? 'bg-[#f96302] text-white border-[#f96302]' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'}`}
              onClick={() => setActiveTab('ALL')}
            >
              Tất cả ({activeTab === 'ALL' ? totalRooms : 'Xem'})
            </Button>
            <Button
              className={`rounded-full font-bold transition-all px-5 ${activeTab === 'FOR_RENT' ? 'bg-[#f96302] text-white border-[#f96302]' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'}`}
              onClick={() => setActiveTab('FOR_RENT')}
            >
              Cho thuê ({activeTab === 'FOR_RENT' ? totalRooms : 'Xem'})
            </Button>
            <Button
              className={`rounded-full font-bold transition-all px-5 ${activeTab === 'FOR_SALE' ? 'bg-[#f96302] text-white border-[#f96302]' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'}`}
              onClick={() => setActiveTab('FOR_SALE')}
            >
              Cần bán ({activeTab === 'FOR_SALE' ? totalRooms : 'Xem'})
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-semibold">Sắp xếp:</span>
            <Select
              defaultValue="newest"
              bordered={false}
              className="font-bold text-gray-700 hover:text-[#f96302] transition-colors"
              onChange={setSortType}
              style={{ width: 160 }}
            >
              <Select.Option value="newest">Mới nhất</Select.Option>
              <Select.Option value="price_asc">Giá thấp đến cao</Select.Option>
              <Select.Option value="price_desc">Giá cao đến thấp</Select.Option>
            </Select>
          </div>
        </div>

        {rooms.length === 0 ? (
          <Empty description="Người này hiện không có tin đăng nào." className="bg-white p-10 rounded-lg shadow-sm" />
        ) : (
          <>
            <Row gutter={[20, 20]}>
              {getSortedRooms().map(room => {
                const rented = isRented(room);

                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={room.id}>
                    <Card
                      hoverable={!rented}
                      // 🟢 VIỀN CAM NẾU LÀ VIP (Đồng bộ HomePage)
                      className={`overflow-hidden border shadow-sm transition-all rounded-lg h-full flex flex-col group ${rented
                        ? 'bg-gray-100 opacity-90 border-gray-200'
                        : ((room.priorityLevel && room.priorityLevel > 0) ? 'border-orange-200 border-2 bg-white hover:shadow-lg' : 'border-gray-200 bg-white hover:shadow-lg')
                        }`}
                      bodyStyle={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}
                      cover={
                        <div className="relative h-44 w-full overflow-hidden">
                          <img
                            src={getImageUrl(room)}
                            className={`h-full w-full object-cover transition-transform duration-500 ${rented ? 'grayscale filter blur-[1px]' : 'group-hover:scale-105'}`}
                            alt="room"
                          />

                          {/* 🟢 NHÃN VIP: Chỉ hiện khi chưa thuê & Có priority */}
                          {!rented && room.priorityLevel > 0 && (
                            <Tag color="#fadb14" className="absolute top-2 right-2 border-none font-bold text-[10px] m-0 flex items-center gap-1 shadow-sm text-black px-1.5 py-0.5 z-10">
                              <CrownFilled /> VIP
                            </Tag>
                          )}

                          {/* 🟢 ICON LỬA: Nếu priority >= 50 */}
                          {!rented && room.priorityLevel >= 50 && (
                            <div className="absolute bottom-2 left-2 text-[#fadb14] animate-bounce drop-shadow-md z-10">
                              <FireFilled style={{ fontSize: '18px' }} />
                            </div>
                          )}

                          {/* OVERLAY KHI ĐÃ THUÊ */}
                          {rented && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                              <div className="border-2 border-white text-white font-bold text-lg px-3 py-1 transform -rotate-12 tracking-wider shadow-lg">
                                ĐÃ CHO THUÊ
                              </div>
                              {room.status === 'FULL' && (
                                <div className="text-white text-xs mt-2 font-medium bg-red-600 px-2 rounded">Hết phòng</div>
                              )}
                            </div>
                          )}

                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm z-10">
                            <CameraFilled /> {room.images?.length || 0}
                          </div>
                        </div>
                      }
                      onClick={() => navigate(`/rooms/${room.id}`)}
                    >
                      <div className="flex-grow">
                        {/* 🟢 TIÊU ĐỀ: Có icon Crown nếu là VIP */}
                        <h3 className={`text-[15px] font-bold line-clamp-2 mb-2 min-h-[44px] leading-snug transition-colors flex items-start gap-1 ${rented ? 'text-gray-500' : ((room.priorityLevel > 0) ? 'text-[#f96302]' : 'text-gray-800')
                          }`}>
                          {!rented && room.priorityLevel > 0 && <CrownFilled className="mt-1 flex-shrink-0" />} {room.title}
                        </h3>

                        <div className="flex items-end gap-2 mb-2">
                          <span className={`font-bold text-lg leading-none ${rented ? 'text-gray-500 decoration-slate-400' : 'text-[#d0021b]'}`}>
                            {formatCurrency(room.price)}
                          </span>
                          <span className="text-gray-400 text-xs pb-0.5">/ tháng</span>
                        </div>

                        <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <EnvironmentOutlined /> {room.address}
                        </div>

                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>{room.area} m²</span>
                          <span className="w-[1px] bg-gray-300 h-3 self-center"></span>

                          {room.rentalType === 'SHARED' ? (
                            <span className={room.currentTenants >= room.capacity ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                              {room.currentTenants || 0}/{room.capacity} người
                            </span>
                          ) : (
                            <span>{room.capacity} ngủ</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-dashed border-gray-100 flex justify-between items-center">
                        <span className="text-xs text-gray-400">{dayjs(room.createdAt).fromNow()}</span>
                        {!rented && <HeartOutlined className="text-gray-400 hover:text-red-500 transition-colors" />}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {totalRooms > pageSize && (
              <div className="flex justify-center mt-8">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={totalRooms}
                  onChange={(page) => {
                    setCurrentPage(page);
                    // Cuộn mượt mà lên đầu danh sách bài viết để theo dõi
                    const element = document.getElementById('room-section-title');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  showSizeChanger={false}
                  className="bg-white px-4 py-2.5 rounded-full shadow-sm border border-gray-100"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LandlordProfile;