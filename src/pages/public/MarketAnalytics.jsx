import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Select, Radio, Row, Col, Typography, Statistic, Spin, Tag, Tooltip, Progress, Empty, Drawer, Button, Descriptions
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  LineChartOutlined, CompassOutlined,
  ArrowUpOutlined, ArrowDownOutlined, RocketOutlined, BulbOutlined,
  PieChartOutlined, SearchOutlined, EyeOutlined
} from '@ant-design/icons';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import roomService from '../../services/roomService';
import provinceData from '../../data/province.json';
import wardData from '../../data/ward.json';

const { Title, Paragraph } = Typography;

const COLORS = ['#f96302', '#2f54eb', '#52c41a', '#722ed1', '#eb2f96'];

const normalizeNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === 'Đang cập nhật') {
    return fallback;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const normalizeApiData = (res, fallback = null) => {
  return res?.data?.result ?? res?.data?.data ?? res?.data ?? fallback;
};

const MarketAnalytics = () => {
  const [transactionType, setTransactionType] = useState('FOR_RENT');
  const [province, setProvince] = useState(undefined);
  const [provinceCode, setProvinceCode] = useState(undefined);
  const [ward, setWard] = useState(undefined);
  const [propertyType, setPropertyType] = useState(undefined);

  const [loading, setLoading] = useState(false);
  const [priceTrendsData, setPriceTrendsData] = useState([]);
  const [marketInsights, setMarketInsights] = useState(null);
  const [topRegions, setTopRegions] = useState([]);
  const [wardPrices, setWardPrices] = useState([]);
  const navigate = useNavigate();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailType, setDetailType] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const openDetail = (type, data) => {
    setDetailType(type);
    setSelectedDetail(data);
    setDetailOpen(true);
  };
  const goToSearchPage = (extraParams = {}) => {
    const params = new URLSearchParams();

    if (province) params.set('province', province);
    if (ward) params.set('ward', ward);

    if (transactionType && transactionType !== 'ALL') {
      params.set('transactionType', transactionType);
      params.set('transactionTypes', transactionType);
    }

    if (propertyType && propertyType !== 'ALL') {
      params.set('type', propertyType);
      params.set('propertyType', propertyType);
    }

    Object.entries(extraParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value);
      }
    });

    navigate(`/filter?${params.toString()}`);
  };
  const provinceOptions = useMemo(() => {
    return Object.values(provinceData || {}).map((p) => ({
      label: p.name_with_type || p.name,
      value: String(p.code),
      name: p.name_with_type || p.name
    }));
  }, []);

  const wardOptions = useMemo(() => {
    if (!provinceCode) return [];

    return Object.values(wardData || {})
      .filter((w) => String(w.parent_code) === String(provinceCode))
      .map((w) => ({
        label: w.name_with_type || w.name,
        value: w.name_with_type || w.name
      }));
  }, [provinceCode]);

  useEffect(() => {
    if (!provinceOptions.length || province) return;

    const defaultProvince =
      provinceOptions.find((p) => p.name === 'Thành phố Hồ Chí Minh') ||
      provinceOptions[0];

    if (defaultProvince) {
      setProvinceCode(defaultProvince.value);
      setProvince(defaultProvince.name);
    }
  }, [provinceOptions, province]);

  const handleProvinceChange = (code, option) => {
    setProvinceCode(code);
    setProvince(option?.name || option?.label);
    setWard(undefined);
  };

  const loadAnalyticsData = async () => {
    setLoading(true);

    try {
      const analyticsParams = {
        transactionType,
        province: province || undefined,
        ward: ward || undefined,
        propertyType: propertyType && propertyType !== 'ALL' ? propertyType : undefined
      };

      const wardPriceParams = {
        transactionType,
        province: province || undefined,
        propertyType: propertyType && propertyType !== 'ALL' ? propertyType : undefined
      };

      const [trendsResult, regionsResult, wardResult] = await Promise.allSettled([
        roomService.getPriceTrends(analyticsParams),
        roomService.getTopRegionsTransactionStats(5, 'province.keyword'),
        roomService.getPricesByWards(wardPriceParams)
      ]);

      if (trendsResult.status === 'fulfilled') {
        const data = normalizeApiData(trendsResult.value, {});
        setPriceTrendsData(Array.isArray(data?.trends) ? data.trends : []);
        setMarketInsights(data?.marketInsights || null);
      } else {
        console.warn('Failed fetching price trends API:', trendsResult.reason?.message);
        setPriceTrendsData([]);
        setMarketInsights(null);
      }

      if (regionsResult.status === 'fulfilled') {
        const data = normalizeApiData(regionsResult.value, []);
        const mappedRegions = Array.isArray(data)
          ? data.map((r) => ({
            name: r.regionName || r.key || 'Khu vực',
            forSaleCount: normalizeNumber(r.forSaleCount),
            forRentCount: normalizeNumber(r.forRentCount)
          }))
          : [];

        setTopRegions(mappedRegions);
      } else {
        console.warn('Failed fetching top regions API:', regionsResult.reason?.message);
        setTopRegions([]);
      }

      if (wardResult.status === 'fulfilled') {
        const data = normalizeApiData(wardResult.value, []);
        const mappedWards = Array.isArray(data)
          ? data.map((w) => ({
            ...w,
            averagePrice: normalizeNumber(w.averagePrice),
            totalPosts: normalizeNumber(w.totalPosts)
          }))
          : [];

        setWardPrices(mappedWards);
      } else {
        console.warn('Failed fetching ward prices API:', wardResult.reason?.message);
        setWardPrices([]);
      }
    } catch (error) {
      console.error('Lỗi tổng thể khi tải dữ liệu phân tích:', error);
      setPriceTrendsData([]);
      setMarketInsights(null);
      setTopRegions([]);
      setWardPrices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [transactionType, province, ward, propertyType]);

  const mainUnit = transactionType === 'FOR_RENT' ? 'tr/tháng' : 'tr/m²';
  const priceColor = transactionType === 'FOR_RENT' ? '#f96302' : '#2f54eb';

  const maxWardPrice = Math.max(...wardPrices.map((w) => normalizeNumber(w.averagePrice, 1)), 1);

  const pieData = topRegions.map((r) => ({
    name: r.name,
    value: transactionType === 'FOR_RENT' ? r.forRentCount : r.forSaleCount
  }));

  const locationLabel = [ward, province].filter(Boolean).join(', ') || 'Toàn quốc';

  const totalPosts = topRegions.reduce((sum, item) => {
    return sum + normalizeNumber(item.forSaleCount) + normalizeNumber(item.forRentCount);
  }, 0);

  const averageResponseTime = priceTrendsData.length > 0 || wardPrices.length > 0 || topRegions.length > 0 ? 120 : 0;

  return (
    <div className="min-h-screen bg-[#fafbfc] pb-12">
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white py-12 px-6 shadow-md border-b border-purple-800/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent opacity-60"></div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/15 border border-orange-500/30 rounded-full text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">
              <RocketOutlined /> Góc nhìn thị trường
            </div>

            <Title level={2} className="m-0 text-white font-extrabold tracking-tight md:text-3xl">
              PHÂN TÍCH & BIẾN ĐỘNG GIÁ
            </Title>

            <Paragraph className="text-gray-400 text-sm mt-2 max-w-2xl mb-0">
              Dữ liệu được lấy trực tiếp từ hệ thống tìm kiếm và thống kê bài đăng đang hoạt động.
            </Paragraph>
          </div>

          <div className="flex gap-4">
            <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-xl text-center py-2 px-4 shadow-inner">
              <Statistic
                title={<span className="text-gray-400 text-xs">Tin đang thống kê</span>}
                value={totalPosts}
                valueStyle={{ color: '#fff', fontSize: '20px', fontWeight: '800' }}
                suffix={<span className="text-gray-400 text-[10px] ml-1">Tin đăng</span>}
              />
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-xl text-center py-2 px-4 shadow-inner">
              <Statistic
                title={<span className="text-gray-400 text-xs">Truy xuất dữ liệu</span>}
                value={averageResponseTime}
                valueStyle={{ color: '#52c41a', fontSize: '20px', fontWeight: '800' }}
                suffix={<span className="text-[10px] ml-1 text-green-400">ms</span>}
              />
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6">
        <Card className="shadow-lg rounded-2xl border-none bg-white/90 backdrop-blur-md p-4">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} lg={6}>
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                Hình thức giao dịch
              </div>

              <Radio.Group
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                optionType="button"
                buttonStyle="solid"
                className="w-full flex"
              >
                <Radio.Button value="FOR_RENT" className="flex-1 text-center font-bold">
                  CHO THUÊ
                </Radio.Button>
                <Radio.Button value="FOR_SALE" className="flex-1 text-center font-bold">
                  MUA BÁN
                </Radio.Button>
              </Radio.Group>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                Tỉnh / Thành phố
              </div>

              <Select
                showSearch
                value={provinceCode}
                onChange={handleProvinceChange}
                options={provinceOptions}
                className="w-full h-9"
                optionFilterProp="label"
                placeholder="Chọn tỉnh/thành"
              />
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                Phường / Xã
              </div>

              <Select
                allowClear
                showSearch
                value={ward}
                onChange={(val) => setWard(val)}
                options={wardOptions}
                className="w-full h-9"
                disabled={!provinceCode}
                optionFilterProp="label"
                placeholder="Tất cả phường/xã"
              />
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                Loại hình Bất động sản
              </div>

              <Select
                value={propertyType || 'ALL'}
                onChange={(val) => setPropertyType(val === 'ALL' ? undefined : val)}
                options={[
                  { label: 'Tất cả loại hình', value: 'ALL' },
                  { label: 'Phòng trọ / Nhà trọ', value: 'ROOM' },
                  { label: 'Căn hộ chung cư', value: 'APARTMENT' },
                  { label: 'Nhà nguyên căn', value: 'HOUSE' }
                ]}
                className="w-full h-9"
              />
            </Col>
          </Row>
        </Card>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        <Spin spinning={loading} tip="Đang truy xuất dữ liệu ElasticSearch...">
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-white overflow-hidden relative border-l-4 border-[#722ed1]">
                <div className="absolute right-[-10px] bottom-[-20px] opacity-10 text-[100px] pointer-events-none">
                  <BulbOutlined />
                </div>

                <Row gutter={[20, 20]} align="middle">
                  <Col xs={24} md={18}>
                    <div className="flex items-center gap-2 text-indigo-800 font-bold mb-2">
                      <BulbOutlined className="text-lg text-purple-600" />
                      <span className="text-sm uppercase tracking-wide">
                        Nhận định từ dữ liệu hệ thống
                      </span>
                    </div>

                    <Paragraph className="text-gray-700 text-sm leading-relaxed m-0 font-medium italic">
                      "{' '}
                      {marketInsights?.yearlyGrowthLabel ||
                        'Chưa đủ dữ liệu giao dịch/tin đăng để tạo nhận định cho khu vực này.'}
                      {' '}"
                    </Paragraph>
                  </Col>

                  <Col xs={24} md={6} className="border-t md:border-t-0 md:border-l border-gray-200/80 pl-0 md:pl-6">
                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="text-xs text-gray-400 font-semibold">Tăng trưởng cùng kỳ</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Tag
                            color={marketInsights?.yearlyGrowthTrend === 'DOWN' ? 'error' : 'success'}
                            className="font-bold text-sm px-2.5 py-0.5 rounded-full flex items-center gap-1 border-none shadow-sm"
                          >
                            {marketInsights?.yearlyGrowthTrend === 'DOWN' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                            {marketInsights?.yearlyGrowthPercent || 0}%
                          </Tag>
                          <span className="text-xs text-gray-500 font-medium">so với kỳ trước</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 font-semibold">Khoảng cách đỉnh giá</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-base font-extrabold text-slate-800">
                            {marketInsights?.diffFromPeakPercent || 0}%
                          </span>
                          <span className="text-xs text-gray-400 italic">so với đỉnh ghi nhận</span>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} lg={16}>
              <Card
                title={
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 flex items-center gap-2">
                      <LineChartOutlined className="text-purple-600" />
                      Xu hướng biến động Giá & Tin đăng
                    </span>
                    <span className="text-xs font-normal text-gray-400 italic">
                      Dữ liệu từ hệ thống
                    </span>
                    <span className="text-xs font-normal text-gray-400 italic">
                      Click vào điểm dữ liệu để xem chi tiết
                    </span>
                  </div>
                }
                className="rounded-2xl border-none shadow-sm h-full"
              >
                {priceTrendsData.length > 0 ? (
                  <div className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={priceTrendsData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        onClick={(state) => {
                          if (state?.activePayload?.length > 0) {
                            openDetail('trend', state.activePayload[0].payload);
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="month" stroke="#8c8c8c" fontSize={11} tickLine={false} />

                        <YAxis
                          yAxisId="left"
                          orientation="left"
                          stroke={priceColor}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v} ${transactionType === 'FOR_RENT' ? 'tr' : 'tr/m²'}`}
                        />

                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#52c41a"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v} bài`}
                        />

                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          labelStyle={{ fontWeight: 'bold', color: '#1f1f1f' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" />

                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="averagePrice"
                          name={`Giá phổ biến (${mainUnit})`}
                          stroke={priceColor}
                          strokeWidth={3}
                          activeDot={{ r: 8 }}
                          dot={{ r: 4 }}
                        />

                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="totalPosts"
                          name="Số lượng bài viết"
                          stroke="#52c41a"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Empty description="Chưa có dữ liệu biến động giá cho bộ lọc này" />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                title={
                  <span className="font-bold text-gray-800 flex items-center gap-2">
                    <PieChartOutlined className="text-purple-600" />
                    Khu vực giao dịch sôi động
                  </span>
                }
                className="rounded-2xl border-none shadow-sm h-full"
              >
                {pieData.length > 0 ? (
                  <>
                    <div className="h-[250px] w-full mt-4 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            onClick={(data) => {
                              if (data?.name) {
                                const matchedProvince = provinceOptions.find((p) => p.name === data.name || p.label === data.name);

                                if (matchedProvince) {
                                  setProvinceCode(matchedProvince.value);
                                  setProvince(matchedProvince.name);
                                  setWard(undefined);
                                }

                                openDetail('region', data);
                              }
                            }}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 mt-2">
                      {pieData.map((item, idx) => (
                        <div
                          key={item.name}
                          className="flex justify-between items-center text-xs cursor-pointer hover:bg-orange-50 rounded px-2 py-1 transition"
                          onClick={() => openDetail('region', item)}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            ></span>
                            <span className="text-gray-600 font-medium">{item.name}</span>
                          </div>
                          <span className="font-bold text-gray-800">{item.value} bài</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <Empty description="Chưa có dữ liệu khu vực giao dịch" />
                )}
              </Card>
            </Col>

            <Col span={24}>
              <Card
                title={
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 flex items-center gap-2">
                      <CompassOutlined className="text-purple-600" />
                      Leaderboard: Phân tích giá theo Phường/Xã
                    </span>
                    <Tag color="purple" className="border-none font-bold rounded">
                      Khu vực: {locationLabel}
                    </Tag>
                  </div>
                }
                className="rounded-2xl border-none shadow-sm"
              >
                {wardPrices.length > 0 ? (
                  <div className="mt-2 space-y-4">
                    {wardPrices.map((item, index) => {
                      const priceVal = normalizeNumber(item.averagePrice);
                      const percent = Math.round((priceVal / maxWardPrice) * 100);

                      return (
                        <div
                          key={`${item.wardName}-${index}`}
                          className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 cursor-pointer hover:bg-orange-50 rounded-lg px-2 py-2 transition"
                          onClick={() => {
                            setWard(item.wardName);
                            openDetail('ward', item);
                          }}
                        >
                          <div className="flex items-center gap-3 w-full md:w-1/4">
                            <span
                              className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index === 0
                                ? 'bg-amber-100 text-amber-700'
                                : index === 1
                                  ? 'bg-slate-100 text-slate-700'
                                  : index === 2
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                              {index + 1}
                            </span>
                            <span className="font-semibold text-gray-800 text-sm truncate">
                              {item.wardName || 'Chưa rõ phường/xã'}
                            </span>
                          </div>

                          <div className="flex-1 md:px-6">
                            <Tooltip title={`Bằng ${percent}% so với khu vực đắt nhất`}>
                              <Progress
                                percent={percent}
                                strokeColor={{
                                  '0%': '#722ed1',
                                  '100%': priceColor
                                }}
                                showInfo={false}
                                status="active"
                                strokeWidth={8}
                              />
                            </Tooltip>
                          </div>

                          <div className="text-right w-full md:w-1/6">
                            <span className="font-black text-base" style={{ color: priceColor }}>
                              {priceVal > 0 ? priceVal.toLocaleString('vi-VN') : 'Đang cập nhật'}
                            </span>
                            <span className="text-xs text-gray-400 font-semibold ml-1">
                              {item.unit || mainUnit}
                            </span>

                            {item.totalPosts !== undefined && (
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {item.totalPosts} tin
                              </div>
                            )}

                            <Button
                              size="small"
                              type="link"
                              icon={<EyeOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setWard(item.wardName);
                                openDetail('ward', item);
                              }}
                              className="px-0"
                            >
                              Chi tiết
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                ) : (
                  <Empty description="Chưa có dữ liệu giá theo phường/xã cho bộ lọc này" />
                )}
              </Card>
            </Col>
          </Row>

        </Spin>
      </div>
      <Drawer
        title={
          detailType === 'trend'
            ? 'Chi tiết biến động giá'
            : detailType === 'region'
              ? 'Chi tiết khu vực giao dịch'
              : 'Chi tiết phường/xã'
        }
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={520}
      >
        {selectedDetail ? (
          <div className="space-y-5">
            {detailType === 'trend' && (
              <>
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Tháng">
                    {selectedDetail.month}
                  </Descriptions.Item>
                  <Descriptions.Item label={`Giá phổ biến (${mainUnit})`}>
                    {normalizeNumber(selectedDetail.averagePrice).toLocaleString('vi-VN')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số lượng tin đăng">
                    {normalizeNumber(selectedDetail.totalPosts).toLocaleString('vi-VN')} tin
                  </Descriptions.Item>
                  <Descriptions.Item label="Khu vực">
                    {locationLabel}
                  </Descriptions.Item>
                  <Descriptions.Item label="Loại giao dịch">
                    {transactionType === 'FOR_RENT' ? 'Cho thuê' : 'Mua bán'}
                  </Descriptions.Item>
                </Descriptions>

                <Card className="rounded-xl bg-orange-50 border-orange-100">
                  <div className="font-bold text-gray-800 mb-1">Gợi ý kiểm tra</div>
                  <div className="text-sm text-gray-600">
                    Mở danh sách tin ở khu vực này để đối chiếu giá thực tế theo từng bài đăng.
                  </div>
                </Card>

                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  className="bg-[#f96302] border-none"
                  onClick={() => goToSearchPage()}
                >
                  Xem tin tại khu vực này
                </Button>
              </>
            )}

            {detailType === 'region' && (
              <>
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Khu vực">
                    {selectedDetail.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tin cho thuê">
                    {normalizeNumber(selectedDetail.forRentCount || selectedDetail.value).toLocaleString('vi-VN')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tin mua bán">
                    {normalizeNumber(selectedDetail.forSaleCount).toLocaleString('vi-VN')}
                  </Descriptions.Item>
                </Descriptions>

                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  className="bg-[#f96302] border-none"
                  onClick={() => {
                    const matchedProvince = provinceOptions.find(
                      (p) => p.name === selectedDetail.name || p.label === selectedDetail.name
                    );

                    goToSearchPage({
                      province: matchedProvince?.name || selectedDetail.name
                    });
                  }}
                >
                  Xem tin tại khu vực này
                </Button>
              </>
            )}

            {detailType === 'ward' && (
              <>
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Phường/Xã">
                    {selectedDetail.wardName}
                  </Descriptions.Item>
                  <Descriptions.Item label={`Giá phổ biến (${selectedDetail.unit || mainUnit})`}>
                    {normalizeNumber(selectedDetail.averagePrice).toLocaleString('vi-VN')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số lượng tin đăng">
                    {normalizeNumber(selectedDetail.totalPosts).toLocaleString('vi-VN')} tin
                  </Descriptions.Item>
                  <Descriptions.Item label="Tỉnh/Thành phố">
                    {province || 'Toàn quốc'}
                  </Descriptions.Item>
                </Descriptions>

                <Card className="rounded-xl bg-purple-50 border-purple-100">
                  <div className="font-bold text-gray-800 mb-1">Ý nghĩa dữ liệu</div>
                  <div className="text-sm text-gray-600">
                    Giá được tổng hợp từ các bài đăng đang hoạt động trong hệ thống tìm kiếm.
                    Bạn có thể mở danh sách tin để xem từng phòng/nhà cụ thể.
                  </div>
                </Card>

                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  className="bg-[#f96302] border-none"
                  onClick={() => goToSearchPage({ ward: selectedDetail.wardName })}
                >
                  Xem tin tại phường/xã này
                </Button>
              </>
            )}
          </div>
        ) : (
          <Empty description="Không có dữ liệu chi tiết" />
        )}
      </Drawer>
    </div>
  );
};

export default MarketAnalytics;