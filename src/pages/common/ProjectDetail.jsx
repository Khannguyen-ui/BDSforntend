import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, Row, Col, Spin, Empty, Button, Tag, Typography, Divider, App, Skeleton
} from 'antd';
import {
  BankOutlined, EnvironmentOutlined, HomeOutlined, ArrowLeftOutlined,
  ProjectOutlined, CrownFilled, FireFilled
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import roomService from '../../services/roomService';
import { getImageUrl } from '../../utils/imageHelper';
import { formatCurrency } from '../../utils/format';

const { Title, Text, Paragraph } = Typography;

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [project, setProject] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const normalizePageData = (res) => {
    const raw =
      res?.data?.result?.content ||
      res?.data?.content ||
      res?.data?.data?.content ||
      res?.data?.items ||
      res?.data?.result ||
      res?.data?.data ||
      res?.data ||
      [];

    return Array.isArray(raw) ? raw : [];
  };

  const normalizeAmenities = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    return String(value)
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  };

  const fetchProjectDetail = async () => {
    setLoading(true);
    try {
      const res = await roomService.getPublicProjectDetail(id);
      const data = res.data?.result || res.data?.data || res.data;
      setProject(data || null);
    } catch (error) {
      console.error(error);
      message.error('Không thể tải chi tiết dự án');
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectRooms = async () => {
    setRoomsLoading(true);
    try {
      const res = await roomService.getRoomsByProject(id, 0, 20);
      setRooms(normalizePageData(res));
    } catch (error) {
      console.error(error);
      message.error('Không thể tải danh sách tin thuộc dự án');
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchProjectDetail();
    fetchProjectRooms();
  }, [id]);

  const stats = useMemo(() => {
    const total = project?.totalProperties ?? rooms.length;
    const forRent = rooms.filter(r => r.transactionType === 'FOR_RENT').length;
    const forSale = rooms.filter(r => r.transactionType === 'FOR_SALE').length;
    const vip = rooms.filter(r => r.priorityLevel > 0 || r.isPromoted).length;

    return { total, forRent, forSale, vip };
  }, [project, rooms]);

  const amenities = useMemo(() => normalizeAmenities(project?.amenities), [project]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <Spin size="large" tip="Đang tải dự án..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center gap-4">
        <Empty description="Không tìm thấy dự án" />
        <Button onClick={() => navigate(-1)}>Quay lại</Button>
      </div>
    );
  }

  const projectImage = project.imageUrl;
  const projectName = project.name || project.title || 'Dự án / khu trọ';

  return (
    <div className="bg-[#f4f4f4] min-h-screen pb-12">
      <div className="max-w-6xl mx-auto px-4 py-5">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="mb-4 hover:text-[#f96302]"
        >
          Quay lại
        </Button>

        {/* HERO */}
        <div className="relative rounded-3xl overflow-hidden shadow-sm bg-white mb-6">
          <div className="relative h-[280px] md:h-[390px] bg-gradient-to-br from-orange-100 via-orange-50 to-white">
            {projectImage ? (
              <img
                src={projectImage}
                alt={projectName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BankOutlined className="text-8xl text-[#f96302]/50" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

            <div className="absolute left-5 right-5 bottom-5 md:left-8 md:right-8 md:bottom-8 text-white">
              <div className="flex flex-wrap gap-2 mb-3">
                <Tag color="#f96302" className="border-none font-semibold px-3 py-1 rounded-full">
                  {project.projectType || 'Dự án'}
                </Tag>

                <Tag
                  color={project.status === 'ACTIVE' ? 'green' : 'default'}
                  className="border-none font-semibold px-3 py-1 rounded-full"
                >
                  {project.status === 'ACTIVE' ? 'Đang hoạt động' : project.status || 'Đang hiển thị'}
                </Tag>
              </div>

              <Title level={1} className="!text-white !mb-3 !text-3xl md:!text-5xl drop-shadow">
                {projectName}
              </Title>

              {project.address && (
                <div className="flex items-start gap-2 text-white/90 max-w-4xl">
                  <EnvironmentOutlined className="mt-1 text-[#f96302]" />
                  <span className="text-sm md:text-base">{project.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STATS */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} md={6}>
            <Card className="rounded-2xl border-none shadow-sm h-full">
              <div className="text-gray-500 text-sm mb-1">Tổng tin</div>
              <div className="flex items-center gap-2">
                <HomeOutlined className="text-[#f96302] text-xl" />
                <span className="text-2xl font-bold text-gray-800">{stats.total}</span>
                <span className="text-gray-400">tin</span>
              </div>
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card className="rounded-2xl border-none shadow-sm h-full">
              <div className="text-gray-500 text-sm mb-1">Cho thuê</div>
              <div className="flex items-center gap-2">
                <ProjectOutlined className="text-blue-500 text-xl" />
                <span className="text-2xl font-bold text-gray-800">{stats.forRent}</span>
                <span className="text-gray-400">tin</span>
              </div>
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card className="rounded-2xl border-none shadow-sm h-full">
              <div className="text-gray-500 text-sm mb-1">Rao bán</div>
              <div className="flex items-center gap-2">
                <BankOutlined className="text-green-500 text-xl" />
                <span className="text-2xl font-bold text-gray-800">{stats.forSale}</span>
                <span className="text-gray-400">tin</span>
              </div>
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card className="rounded-2xl border-none shadow-sm h-full">
              <div className="text-gray-500 text-sm mb-1">Tin VIP</div>
              <div className="flex items-center gap-2">
                <CrownFilled className="text-yellow-500 text-xl" />
                <span className="text-2xl font-bold text-gray-800">{stats.vip}</span>
                <span className="text-gray-400">tin</span>
              </div>
            </Card>
          </Col>
        </Row>

        {/* INFO */}
        <Card className="rounded-2xl shadow-sm border-none mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BankOutlined className="text-[#f96302] text-xl" />
            <Title level={4} className="!mb-0">Thông tin dự án</Title>
          </div>

          {project.description ? (
            <Paragraph className="text-gray-600 whitespace-pre-line leading-7 mb-0">
              {project.description}
            </Paragraph>
          ) : (
            <Text type="secondary">Dự án chưa cập nhật mô tả chi tiết.</Text>
          )}

          {amenities.length > 0 && (
            <>
              <Divider />
              <Title level={5}>Tiện ích nổi bật</Title>
              <div className="flex flex-wrap gap-2">
                {amenities.map((item, index) => (
                  <Tag
                    key={`${item}-${index}`}
                    color="orange"
                    className="rounded-full px-3 py-1 border-none bg-orange-50 text-[#f96302]"
                  >
                    {item}
                  </Tag>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* ROOMS */}
        <Card
          className="rounded-2xl shadow-sm border-none"
          title={
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="flex items-center gap-2">
                <ProjectOutlined className="text-[#f96302]" />
                <span className="font-bold">Tin đăng thuộc dự án này</span>
              </div>

              <Button
                type="link"
                className="text-[#f96302] p-0"
                onClick={() => navigate('/filter', { state: { projectId: project.id, projectName } })}
              >
                Xem tất cả tin
              </Button>
            </div>
          }
        >
          {roomsLoading ? (
            <Row gutter={[16, 16]}>
              {[1, 2, 3, 4, 5, 6].map(item => (
                <Col xs={24} sm={12} lg={8} key={item}>
                  <Skeleton active />
                </Col>
              ))}
            </Row>
          ) : rooms.length === 0 ? (
            <Empty description="Chưa có tin đăng đang hiển thị thuộc dự án này" />
          ) : (
            <Row gutter={[16, 16]}>
              {rooms.map(room => {
                const isVip = room.priorityLevel > 0 || room.isPromoted;
                const isForRent = room.transactionType === 'FOR_RENT';

                return (
                  <Col xs={24} sm={12} lg={8} key={room.id}>
                    <Card
                      hoverable
                      className={`rounded-2xl overflow-hidden h-full transition-all ${
                        isVip ? 'border-2 border-orange-200 shadow-md' : 'border border-gray-100'
                      }`}
                      onClick={() => navigate(`/rooms/${room.id}`)}
                      cover={
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={getImageUrl(room)}
                            alt={room.title}
                            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                            loading="lazy"
                          />

                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                          <Tag
                            color={isForRent ? '#f96302' : 'blue'}
                            className="absolute top-3 left-3 border-none font-semibold"
                          >
                            {isForRent ? 'Cho thuê' : 'Rao bán'}
                          </Tag>

                          {isVip && (
                            <Tag
                              color="#fadb14"
                              className="absolute top-3 right-3 border-none text-black font-bold flex items-center gap-1"
                            >
                              <CrownFilled /> VIP
                            </Tag>
                          )}

                          {(room.priorityLevel >= 50 || room.isPromoted) && (
                            <FireFilled className="absolute bottom-3 left-3 text-yellow-400 text-lg drop-shadow animate-bounce" />
                          )}
                        </div>
                      }
                    >
                      <div className={`font-bold line-clamp-2 mb-2 h-11 ${
                        isVip ? 'text-[#f96302]' : 'text-gray-800'
                      }`}>
                        {room.title}
                      </div>

                      <div className="text-red-600 font-bold text-base mb-2">
                        {room.price ? formatCurrency(room.price) : 'Thỏa thuận'}
                        {isForRent ? '/tháng' : ''}
                      </div>

                      <div className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[32px]">
                        <EnvironmentOutlined className="mr-1" />
                        {room.address}
                      </div>

                      <div className="flex justify-between items-center border-t border-dashed pt-3">
                        <Tag color="blue" className="m-0">
                          {room.area || '--'} m²
                        </Tag>

                        <span className="text-xs text-[#f96302] font-semibold">
                          Xem chi tiết
                        </span>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProjectDetail;