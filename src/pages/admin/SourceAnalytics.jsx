import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Typography,
  Statistic,
  Progress,
  Button,
  message,
  Tag,
  Space,
  Empty,
} from 'antd';
import {
  BarChartOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import recommendService from '../../services/recommendService';

const { Title, Text } = Typography;

const SourceAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]);
  const [bestSource, setBestSource] = useState(null);
  const [worstSource, setWorstSource] = useState(null);

  const unwrap = (res) => res?.data?.result || res?.data?.data || res?.data;

  const fetchData = async () => {
    setLoading(true);

    try {
      const [ctrRes, bestRes, worstRes] = await Promise.all([
        recommendService.getSourceCtr(),
        recommendService.getBestSource(),
        recommendService.getWorstSource(),
      ]);

      const ctrData = unwrap(ctrRes);
      setSources(Array.isArray(ctrData) ? ctrData : []);

      setBestSource(unwrap(bestRes) || null);
      setWorstSource(unwrap(worstRes) || null);
    } catch (error) {
      console.error('Lỗi tải source analytics:', error);
      message.error('Không thể tải dữ liệu phân tích nguồn đề xuất');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalImpressions = useMemo(
    () => sources.reduce((sum, item) => sum + Number(item.impressions || 0), 0),
    [sources]
  );

  const totalClicks = useMemo(
    () => sources.reduce((sum, item) => sum + Number(item.clicks || 0), 0),
    [sources]
  );

  const totalContacts = useMemo(
    () => sources.reduce((sum, item) => sum + Number(item.contacts || 0), 0),
    [sources]
  );

  const avgCtr = totalImpressions === 0 ? 0 : (totalClicks / totalImpressions) * 100;

  const formatPercent = (value) => {
    const num = Number(value || 0);
    return `${num.toFixed(2)}%`;
  };

  const getSourceLabel = (source) => {
    const labels = {
      BEHAVIOR: 'Theo hành vi',
      COLLABORATIVE: 'Người dùng tương tự',
      TRENDING: 'Thịnh hành',
      RANDOM: 'Khám phá ngẫu nhiên',
      PROMOTED: 'Tin được đẩy',
      FOLLOWING_OWNER: 'Theo chủ trọ đang theo dõi',
      LIKED_OWNER: 'Theo chủ trọ đã thích',
    };

    return labels[source] || source || 'Không rõ';
  };

  const columns = [
    {
      title: 'Nguồn đề xuất',
      dataIndex: 'source',
      key: 'source',
      render: (source) => (
        <Space direction="vertical" size={0}>
          <Text strong>{getSourceLabel(source)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {source}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Hiển thị',
      dataIndex: 'impressions',
      key: 'impressions',
      align: 'right',
      render: (value) => Number(value || 0).toLocaleString('vi-VN'),
    },
    {
      title: 'Click',
      dataIndex: 'clicks',
      key: 'clicks',
      align: 'right',
      render: (value) => Number(value || 0).toLocaleString('vi-VN'),
    },
    {
      title: 'Liên hệ',
      dataIndex: 'contacts',
      key: 'contacts',
      align: 'right',
      render: (value) => Number(value || 0).toLocaleString('vi-VN'),
    },
    {
      title: 'CTR',
      dataIndex: 'ctr',
      key: 'ctr',
      align: 'center',
      render: (value) => (
        <Tag color={Number(value || 0) >= 10 ? 'green' : Number(value || 0) >= 3 ? 'blue' : 'orange'}>
          {formatPercent(value)}
        </Tag>
      ),
    },
    {
      title: 'Contact Rate',
      dataIndex: 'contactRate',
      key: 'contactRate',
      align: 'center',
      render: (value) => (
        <Tag color="purple">
          {formatPercent(value)}
        </Tag>
      ),
    },
    {
      title: 'Hiệu suất CTR',
      key: 'progress',
      render: (_, record) => (
        <Progress
          percent={Number(record.ctr || 0)}
          size="small"
          status={Number(record.ctr || 0) >= 10 ? 'success' : 'normal'}
          format={(percent) => `${Number(percent || 0).toFixed(2)}%`}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ marginBottom: 4 }}>
              <BarChartOutlined /> Phân tích nguồn đề xuất
            </Title>
            <Text type="secondary">
              Theo dõi CTR, lượt click và tỷ lệ liên hệ của từng nguồn recommendation.
            </Text>
          </Col>

          <Col>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
              style={{ background: '#f96302', borderColor: '#f96302' }}
            >
              Làm mới
            </Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng hiển thị"
              value={totalImpressions}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng click"
              value={totalClicks}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng liên hệ"
              value={totalContacts}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="CTR trung bình"
              value={avgCtr}
              precision={2}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card>
            <Statistic
              title="Nguồn hiệu quả nhất"
              value={bestSource ? getSourceLabel(bestSource.source) : 'Chưa có dữ liệu'}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />

            {bestSource && (
              <div style={{ marginTop: 16 }}>
                <Text>CTR: </Text>
                <Tag color="green">{formatPercent(bestSource.ctr)}</Tag>
                <Text> Contact Rate: </Text>
                <Tag color="purple">{formatPercent(bestSource.contactRate)}</Tag>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card>
            <Statistic
              title="Nguồn kém hiệu quả nhất"
              value={worstSource ? getSourceLabel(worstSource.source) : 'Chưa có dữ liệu'}
              prefix={<FallOutlined />}
              valueStyle={{ color: '#ff4d4f', fontSize: 22 }}
            />

            {worstSource && (
              <div style={{ marginTop: 16 }}>
                <Text>CTR: </Text>
                <Tag color="red">{formatPercent(worstSource.ctr)}</Tag>
                <Text> Contact Rate: </Text>
                <Tag color="purple">{formatPercent(worstSource.contactRate)}</Tag>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="Bảng hiệu suất nguồn recommendation"
        extra={
          <Text type="secondary">
            CTR = Click / Impression
          </Text>
        }
      >
        {sources.length === 0 && !loading ? (
          <Empty description="Chưa có dữ liệu source analytics" />
        ) : (
          <Table
            rowKey={(record) => record.source}
            columns={columns}
            dataSource={sources}
            loading={loading}
            pagination={false}
          />
        )}
      </Card>
    </div>
  );
};

export default SourceAnalytics;