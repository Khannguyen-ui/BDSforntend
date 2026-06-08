import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Tabs, Table, Form, InputNumber, Button, message, Spin, Statistic } from 'antd';
import { AreaChartOutlined, FireOutlined, SettingOutlined, EyeOutlined, LikeOutlined, HeartOutlined, StopOutlined } from '@ant-design/icons';
import recommendService from '../../services/recommendService';
import { formatCurrency } from '../../utils/format';

const { Title, Text } = Typography;

const RecommendDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [trendingProperties, setTrendingProperties] = useState([]);
  const [trendingReels, setTrendingReels] = useState([]);
  const [rankingConfig, setRankingConfig] = useState(null);

  const [form] = Form.useForm();

  useEffect(() => {
    fetchDashboard();
    fetchTrending();
    fetchConfig();
  }, []);

  const unwrap = (res) => res.data?.result || res.data?.data || res.data;

  const fetchDashboard = async () => {
    try {
      const res = await recommendService.getDashboard();
      setDashboardData(unwrap(res) || {});
    } catch (error) {
      console.warn("Lỗi tải dashboard:", error);
    }
  };

  const fetchTrending = async () => {
    try {
      const [propsRes, reelsRes] = await Promise.all([
        recommendService.getTrendingProperties(10),
        recommendService.getTrendingReels(10)
      ]);

      const propsData = unwrap(propsRes);
      const reelsData = unwrap(reelsRes);

      setTrendingProperties(Array.isArray(propsData) ? propsData : (propsData?.content || []));
      setTrendingReels(Array.isArray(reelsData) ? reelsData : (reelsData?.content || []));
    } catch (error) {
      console.warn("Lỗi tải trending:", error);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await recommendService.getRankingConfig();
      const data = unwrap(res);
      setRankingConfig(data);
      form.setFieldsValue(data || {});
    } catch (error) {
      console.warn("Lỗi tải cấu hình:", error);
    }
  };

  const handleUpdateConfig = async (values) => {
    setLoading(true);
    try {
      await recommendService.updateRankingConfig(values);
      message.success("Cập nhật cấu hình Ranking thành công!");
      fetchConfig();
    } catch (error) {
      message.error("Lỗi cập nhật cấu hình.");
    } finally {
      setLoading(false);
    }
  };

  const propertyColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <Text strong>{text || 'Chưa cập nhật'}</Text>
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (val) => <Text type="success">{Number(val || 0).toFixed(2)}</Text>
    },
    {
      title: 'Lượt xem',
      key: 'views',
      render: (_, record) => record.viewCount ?? record.views ?? record.totalViews ?? 0
    },
    {
      title: 'Lượt thích',
      key: 'likes',
      render: (_, record) => record.likeCount ?? record.likes ?? record.totalLikes ?? 0
    },
    {
      title: 'Lượt lưu',
      key: 'saves',
      render: (_, record) => record.saveCount ?? record.saves ?? record.totalSaves ?? 0
    },
  ];

  return (
    <div className="p-6 font-sans">
      <div className="mb-6">
        <Title level={3}>Quản trị AI & Đề xuất</Title>
        <Text type="secondary">Hệ thống phân tích hành vi và tùy chỉnh thuật toán phân phối nội dung.</Text>
      </div>

      <Tabs
        defaultActiveKey="1"
        type="card"
        items={[
          {
            key: '1',
            label: <span><AreaChartOutlined /> Tổng quan</span>,
            children: (
              <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="Tổng lượt xem" value={dashboardData?.totalViews || 0} prefix={<EyeOutlined />} styles={{ content: { color: '#1890ff' } }} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="Tổng lượt thích" value={dashboardData?.totalLikes || 0} prefix={<LikeOutlined />} styles={{ content: { color: '#eb2f96' } }} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="Tổng lượt lưu" value={dashboardData?.totalSaves || 0} prefix={<HeartOutlined />} styles={{ content: { color: '#faad14' } }} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="Bị báo cáo (Spam)" value={dashboardData?.totalSpamReports || 0} prefix={<StopOutlined />} styles={{ content: { color: '#f5222d' } }} />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: '2',
            label: <span><FireOutlined /> Thịnh hành (Trending)</span>,
            children: (
              <Row gutter={[24, 24]}>
                <Col span={24}>
                  <Card title="Top 10 Bất động sản" className="shadow-sm">
                    <Table
                      dataSource={trendingProperties}
                      columns={propertyColumns}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  </Card>
                </Col>
                <Col span={24}>
                  <Card title="Top 10 Reels" className="shadow-sm">
                    <Table
                      dataSource={trendingReels}
                      columns={propertyColumns}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: '3',
            label: <span><SettingOutlined /> Cấu hình Thuật toán</span>,
            forceRender: true,
            children: (
              <Card title="Tùy chỉnh Trọng số Xếp hạng (Ranking Weights)" className="shadow-sm max-w-3xl">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleUpdateConfig}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Trọng số Lượt xem (Views Weight)" name="viewWeight" rules={[{ required: true }]}>
                        <InputNumber className="w-full" step={0.1} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Trọng số Lượt thích (Likes Weight)" name="likeWeight" rules={[{ required: true }]}>
                        <InputNumber className="w-full" step={0.1} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Trọng số Lượt lưu (Saves Weight)" name="saveWeight" rules={[{ required: true }]}>
                        <InputNumber className="w-full" step={0.1} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Điểm trừ Spam (Spam Penalty)" name="spamPenalty" rules={[{ required: true }]}>
                        <InputNumber className="w-full" step={0.1} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Hệ số Đẩy bài VIP (Promoted Boost)" name="promotedBoost" rules={[{ required: true }]}>
                        <InputNumber className="w-full" step={0.1} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Tỷ lệ Random (Khám phá mới)" name="randomExplorationRate" rules={[{ required: true }]}>
                        <InputNumber className="w-full" step={0.05} min={0} max={1} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item className="mt-4">
                    <Button type="primary" htmlType="submit" loading={loading} className="bg-[#f96302] border-none font-bold px-8">
                      Lưu Cấu Hình
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            ),
          }
        ]}
      />
    </div>
  );
};

export default RecommendDashboard;
