import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Spin, Empty, Button, Tag, Typography, Statistic, Divider, App
} from 'antd';
import {
  BankOutlined, EnvironmentOutlined, HomeOutlined, ArrowLeftOutlined,
  ProjectOutlined
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
      res.data?.result?.content ||
      res.data?.content ||
      res.data?.items ||
      res.data?.result ||
      res.data ||
      [];

    return Array.isArray(raw) ? raw : [];
  };

  const fetchProjectDetail = async () => {
    setLoading(true);
    try {
      const res = await roomService.getPublicProjectDetail(id);
      const data = res.data?.result || res.data;
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
      const res = await roomService.getPublicPropertiesByProject(id, 0, 20);
      const data = normalizePageData(res);
      setRooms(data);
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

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Spin size="large" tip="Đang tải dự án..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-4">
        <Empty description="Không tìm thấy dự án" />
        <Button onClick={() => navigate(-1)}>Quay lại</Button>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen pb-10">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          Quay lại
        </Button>

        <Card className="rounded-2xl shadow-sm border-none overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-3xl">
                <BankOutlined />
              </div>

              <div className="flex-1">
                <Title level={2} className="!text-white !mb-2">
                  {project.name || 'Dự án / khu trọ'}
                </Title>

                <div className="flex flex-wrap gap-2 mb-3">
                  {project.projectType && (
                    <Tag color="blue" className="border-none">
                      {project.projectType}
                    </Tag>
                  )}
                  {project.status && (
                    <Tag color={project.status === 'ACTIVE' ? 'green' : 'default'}>
                      {project.status === 'ACTIVE' ? 'Đang hoạt động' : project.status}
                    </Tag>
                  )}
                </div>

                {project.address && (
                  <div className="flex items-start gap-2 text-white/90">
                    <EnvironmentOutlined className="mt-1" />
                    <span>{project.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card className="bg-gray-50 border-none rounded-xl">
                <Statistic
                  title="Tin đang thuộc dự án"
                  value={rooms.length}
                  suffix="tin"
                  prefix={<HomeOutlined />}
                />
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card className="bg-gray-50 border-none rounded-xl">
                <Statistic
                  title="Tin cho thuê"
                  value={rooms.filter(r => r.transactionType === 'FOR_RENT').length}
                  suffix="tin"
                />
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card className="bg-gray-50 border-none rounded-xl">
                <Statistic
                  title="Tin rao bán"
                  value={rooms.filter(r => r.transactionType === 'FOR_SALE').length}
                  suffix="tin"
                />
              </Card>
            </Col>
          </Row>

          {project.description && (
            <>
              <Divider />
              <Title level={4}>Thông tin dự án</Title>
              <Paragraph className="text-gray-600 whitespace-pre-line">
                {project.description}
              </Paragraph>
            </>
          )}

          {project.amenities && project.amenities.length > 0 && (
            <>
              <Divider />
              <Title level={4}>Tiện ích dự án</Title>
              <div className="flex flex-wrap gap-2">
                {project.amenities.map((item, index) => (
                  <Tag key={index} color="cyan" className="rounded-full px-3 py-1">
                    {item}
                  </Tag>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card
          title={
            <div className="flex items-center gap-2">
              <ProjectOutlined className="text-blue-600" />
              <span className="font-bold">Tin đăng thuộc dự án này</span>
            </div>
          }
          className="rounded-2xl shadow-sm border-none"
          loading={roomsLoading}
        >
          {rooms.length === 0 ? (
            <Empty description="Chưa có tin đăng đang hiển thị thuộc dự án này" />
          ) : (
            <Row gutter={[16, 16]}>
              {rooms.map(room => (
                <Col xs={24} sm={12} lg={8} key={room.id}>
                  <Card
                    hoverable
                    className="rounded-xl overflow-hidden h-full"
                    onClick={() => navigate(`/rooms/${room.id}`)}
                    cover={
                      <img
                        src={getImageUrl(room)}
                        alt={room.title}
                        className="h-44 w-full object-cover"
                      />
                    }
                  >
                    <div className="font-bold text-gray-800 line-clamp-1 mb-2">
                      {room.title}
                    </div>

                    <div className="text-red-600 font-bold mb-2">
                      {room.price ? formatCurrency(room.price) : 'Thỏa thuận'}
                      {room.transactionType === 'FOR_RENT' ? '/tháng' : ''}
                    </div>

                    <div className="text-xs text-gray-500 line-clamp-2 mb-2">
                      <EnvironmentOutlined /> {room.address}
                    </div>

                    <div className="flex justify-between items-center">
                      <Tag color="blue">{room.area || '--'} m²</Tag>
                      {room.priorityLevel > 0 && <Tag color="orange">VIP</Tag>}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProjectDetail;