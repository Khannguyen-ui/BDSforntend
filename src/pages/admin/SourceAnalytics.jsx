import React, { useEffect, useMemo, useState } from "react";
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
} from "antd";
import {
  BarChartOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  PhoneOutlined,
  TrophyOutlined,
  AlertOutlined,
} from "@ant-design/icons";
import recommendService from "../../services/recommendService";

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
      console.error("Lỗi tải source analytics:", error);
      message.error("Không thể tải dữ liệu phân tích nguồn đề xuất");
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

  const avgCtr =
    totalImpressions === 0 ? 0 : (totalClicks / totalImpressions) * 100;

  const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

  const getSourceLabel = (source) => {
    const labels = {
      BEHAVIOR: "Theo hành vi",
      COLLABORATIVE: "Người dùng tương tự",
      TRENDING: "Thịnh hành",
      RANDOM: "Khám phá ngẫu nhiên",
      PROMOTED: "Tin được đẩy",
      FOLLOWING_OWNER: "Theo chủ trọ đang theo dõi",
      LIKED_OWNER: "Theo chủ trọ đã thích",
    };

    return labels[source] || source || "Không rõ";
  };

  const getCtrColor = (value) => {
    const num = Number(value || 0);
    if (num >= 10) return "green";
    if (num >= 3) return "blue";
    return "gold";
  };

  const metricCards = [
    {
      title: "Tổng hiển thị",
      value: totalImpressions,
      icon: <EyeOutlined />,
      color: "#2563EB",
      bg: "from-blue-50 to-white",
    },
    {
      title: "Tổng click",
      value: totalClicks,
      icon: <ThunderboltOutlined />,
      color: "#7C3AED",
      bg: "from-violet-50 to-white",
    },
    {
      title: "Tổng liên hệ",
      value: totalContacts,
      icon: <PhoneOutlined />,
      color: "#16A34A",
      bg: "from-emerald-50 to-white",
    },
    {
      title: "CTR trung bình",
      value: avgCtr,
      suffix: "%",
      precision: 2,
      icon: <BarChartOutlined />,
      color: "#0891B2",
      bg: "from-cyan-50 to-white",
    },
  ];

  const columns = [
    {
      title: "Nguồn đề xuất",
      dataIndex: "source",
      key: "source",
      render: (source) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-800">
            {getSourceLabel(source)}
          </Text>
          <Text className="text-xs text-slate-400">{source}</Text>
        </Space>
      ),
    },
    {
      title: "Hiển thị",
      dataIndex: "impressions",
      key: "impressions",
      align: "right",
      render: (value) => (
        <Text strong>{Number(value || 0).toLocaleString("vi-VN")}</Text>
      ),
    },
    {
      title: "Click",
      dataIndex: "clicks",
      key: "clicks",
      align: "right",
      render: (value) => Number(value || 0).toLocaleString("vi-VN"),
    },
    {
      title: "Liên hệ",
      dataIndex: "contacts",
      key: "contacts",
      align: "right",
      render: (value) => Number(value || 0).toLocaleString("vi-VN"),
    },
    {
      title: "CTR",
      dataIndex: "ctr",
      key: "ctr",
      align: "center",
      render: (value) => (
        <Tag color={getCtrColor(value)} className="rounded-full px-3">
          {formatPercent(value)}
        </Tag>
      ),
    },
    {
      title: "Contact Rate",
      dataIndex: "contactRate",
      key: "contactRate",
      align: "center",
      render: (value) => (
        <Tag color="purple" className="rounded-full px-3">
          {formatPercent(value)}
        </Tag>
      ),
    },
    {
      title: "Hiệu suất CTR",
      key: "progress",
      render: (_, record) => {
        const ctr = Number(record.ctr || 0);

        return (
          <Progress
            percent={Math.min(ctr, 100)}
            size="small"
            strokeColor={ctr >= 10 ? "#22C55E" : ctr >= 3 ? "#2563EB" : "#F59E0B"}
            trailColor="#E2E8F0"
            format={() => `${ctr.toFixed(2)}%`}
          />
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6">
      <style>{`
        .hv-analytics-table .ant-table {
          background: transparent;
        }

        .hv-analytics-table .ant-table-thead > tr > th {
          background: #F8FAFC !important;
          color: #475569 !important;
          font-weight: 800 !important;
          border-bottom: 1px solid #E2E8F0 !important;
        }

        .hv-analytics-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #F1F5F9 !important;
        }

        .hv-analytics-table .ant-table-tbody > tr:hover > td {
          background: #EFF6FF !important;
        }

        .hv-card {
          border-radius: 24px !important;
          border: 1px solid #E2E8F0 !important;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.06);
        }

        .hv-card .ant-card-body {
          padding: 22px !important;
        }
      `}</style>

      <div className="mb-6 rounded-[28px] bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#2563EB] p-6 md:p-8 text-white shadow-[0_20px_60px_rgba(37,99,235,0.22)]">
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold mb-4">
              <BarChartOutlined />
              Recommendation Analytics
            </div>

            <Title level={2} className="!text-white !mb-2">
              Phân tích nguồn đề xuất
            </Title>

            <Text className="text-white/70 text-base">
              Theo dõi CTR, lượt click và tỷ lệ liên hệ của từng nguồn
              recommendation trong HomeVerse.
            </Text>
          </Col>

          <Col>
            <Button
              size="large"
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
              className="rounded-full h-11 px-6 font-bold bg-white text-[#2563EB] border-none hover:!text-[#1D4ED8] hover:!bg-blue-50"
            >
              Làm mới
            </Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        {metricCards.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.title}>
            <Card className={`hv-card bg-gradient-to-br ${item.bg}`}>
              <div className="flex items-center justify-between">
                <Statistic
                  title={
                    <span className="text-slate-500 font-semibold">
                      {item.title}
                    </span>
                  }
                  value={item.value}
                  precision={item.precision}
                  suffix={item.suffix}
                  valueStyle={{
                    color: "#0F172A",
                    fontWeight: 800,
                    fontSize: 28,
                  }}
                />

                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
                  style={{
                    color: item.color,
                    background: `${item.color}14`,
                  }}
                >
                  {item.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} md={12}>
          <Card className="hv-card bg-white">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
                <TrophyOutlined />
              </div>

              <div className="flex-1">
                <Text className="text-slate-500 font-semibold">
                  Nguồn hiệu quả nhất
                </Text>

                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {bestSource
                    ? getSourceLabel(bestSource.source)
                    : "Chưa có dữ liệu"}
                </div>

                {bestSource && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag color="green" className="rounded-full px-3 py-1">
                      CTR {formatPercent(bestSource.ctr)}
                    </Tag>
                    <Tag color="purple" className="rounded-full px-3 py-1">
                      Contact {formatPercent(bestSource.contactRate)}
                    </Tag>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card className="hv-card bg-white">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-2xl">
                <AlertOutlined />
              </div>

              <div className="flex-1">
                <Text className="text-slate-500 font-semibold">
                  Nguồn cần tối ưu
                </Text>

                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {worstSource
                    ? getSourceLabel(worstSource.source)
                    : "Chưa có dữ liệu"}
                </div>

                {worstSource && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag color="red" className="rounded-full px-3 py-1">
                      CTR {formatPercent(worstSource.ctr)}
                    </Tag>
                    <Tag color="purple" className="rounded-full px-3 py-1">
                      Contact {formatPercent(worstSource.contactRate)}
                    </Tag>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        className="hv-card bg-white"
        title={
          <div>
            <div className="text-lg font-extrabold text-slate-900">
              Bảng hiệu suất nguồn recommendation
            </div>
            <div className="text-xs text-slate-400 font-medium">
              CTR = Click / Impression
            </div>
          </div>
        }
        extra={
          <Tag color="blue" className="rounded-full px-3 py-1">
            {sources.length} nguồn
          </Tag>
        }
      >
        {sources.length === 0 && !loading ? (
          <Empty description="Chưa có dữ liệu source analytics" />
        ) : (
          <Table
            className="hv-analytics-table"
            rowKey={(record) => record.source}
            columns={columns}
            dataSource={sources}
            loading={loading}
            pagination={false}
            scroll={{ x: 900 }}
          />
        )}
      </Card>
    </div>
  );
};

export default SourceAnalytics;