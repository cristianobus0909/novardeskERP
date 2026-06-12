'use client';

import React, { useState, useEffect } from 'react';
// @ts-ignore
import { Responsive, useContainerWidth, Layout } from 'react-grid-layout';
import { apiRequest } from '../../lib/api-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function DashboardView() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { width, containerRef, mounted } = useContainerWidth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiRequest('/ventas/stats');
        setStats(data);
      } catch (err: any) {
        console.error('Error fetching stats:', err);
        setErrorMsg(err.message || 'Error desconocido al cargar métricas');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

    const defaultLayouts = {
    lg: [
      { i: 'kpi-today', x: 0, y: 0, w: 3, h: 2 },
      { i: 'kpi-month', x: 3, y: 0, w: 3, h: 2 },
      { i: 'bar-chart', x: 0, y: 2, w: 6, h: 5 },
      { i: 'pie-chart', x: 6, y: 0, w: 6, h: 7 },
      { i: 'pie-metodos', x: 0, y: 7, w: 6, h: 7 },
      { i: 'pie-vendedores', x: 6, y: 7, w: 6, h: 7 },
    ],
    md: [
      { i: 'kpi-today', x: 0, y: 0, w: 5, h: 2 },
      { i: 'kpi-month', x: 5, y: 0, w: 5, h: 2 },
      { i: 'bar-chart', x: 0, y: 2, w: 10, h: 5 },
      { i: 'pie-chart', x: 0, y: 7, w: 5, h: 6 },
      { i: 'pie-metodos', x: 5, y: 7, w: 5, h: 6 },
      { i: 'pie-vendedores', x: 0, y: 13, w: 5, h: 6 },
    ],
    sm: [
      { i: 'kpi-today', x: 0, y: 0, w: 3, h: 2 },
      { i: 'kpi-month', x: 3, y: 0, w: 3, h: 2 },
      { i: 'bar-chart', x: 0, y: 2, w: 6, h: 5 },
      { i: 'pie-chart', x: 0, y: 7, w: 6, h: 6 },
      { i: 'pie-metodos', x: 0, y: 13, w: 6, h: 6 },
      { i: 'pie-vendedores', x: 0, y: 19, w: 6, h: 6 },
    ],
    xs: [
      { i: 'kpi-today', x: 0, y: 0, w: 2, h: 2 },
      { i: 'kpi-month', x: 2, y: 0, w: 2, h: 2 },
      { i: 'bar-chart', x: 0, y: 2, w: 4, h: 5 },
      { i: 'pie-chart', x: 0, y: 7, w: 4, h: 6 },
      { i: 'pie-metodos', x: 0, y: 13, w: 4, h: 6 },
      { i: 'pie-vendedores', x: 0, y: 19, w: 4, h: 6 },
    ],
    xxs: [
      { i: 'kpi-today', x: 0, y: 0, w: 2, h: 2 },
      { i: 'kpi-month', x: 0, y: 2, w: 2, h: 2 },
      { i: 'bar-chart', x: 0, y: 4, w: 2, h: 5 },
      { i: 'pie-chart', x: 0, y: 9, w: 2, h: 6 },
      { i: 'pie-metodos', x: 0, y: 15, w: 2, h: 6 },
      { i: 'pie-vendedores', x: 0, y: 21, w: 2, h: 6 },
    ]
  };

  const [layouts, setLayouts] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_layouts_v2');
      if (saved) return JSON.parse(saved);
    }
    return defaultLayouts;
  });

  const [chartTypes, setChartTypes] = useState<Record<string, 'pie' | 'bar'>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_chartTypes');
      if (saved) return JSON.parse(saved);
    }
    return {
      topProductos: 'pie',
      metodos: 'pie',
      vendedores: 'pie'
    };
  });

  useEffect(() => {
    localStorage.setItem('dashboard_layouts_v2', JSON.stringify(layouts));
  }, [layouts]);

  useEffect(() => {
    localStorage.setItem('dashboard_chartTypes', JSON.stringify(chartTypes));
  }, [chartTypes]);

  const toggleChartType = (key: string) => {
    setChartTypes(prev => ({ ...prev, [key]: prev[key] === 'pie' ? 'bar' : 'pie' }));
  };

  if (loading) return <div style={{ padding: '24px' }}>Cargando panel...</div>;
  if (errorMsg) return (
    <div style={{ padding: '24px', color: 'var(--destructive)', background: 'hsl(var(--destructive)/0.1)', borderRadius: '8px', margin: '24px' }}>
      <strong>Error al cargar métricas:</strong> {errorMsg}
    </div>
  );
  if (!stats) return <div style={{ padding: '24px' }}>Error al cargar métricas (datos vacíos).</div>;

  const CustomPieTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const name = payload[0].name === 'cantidad' ? label : payload[0].name;
      return (
        <div style={{ background: 'var(--bg-primary)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <p>{`${name}: ${payload[0].value} unid.`}</p>
        </div>
      );
    }
    return null;
  };

  const CustomMetodosTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const name = payload[0].name === 'total' ? label : payload[0].name;
      return (
        <div style={{ background: 'var(--bg-primary)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <p>{`${name}: $${Number(payload[0].value).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}</p>
        </div>
      );
    }
    return null;
  };

  const CustomVendedoresTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const name = payload[0].name === 'total' ? label : payload[0].name;
      return (
        <div style={{ background: 'var(--bg-primary)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <p>{`${name}: $${Number(payload[0].value).toLocaleString('es-AR', { minimumFractionDigits: 2 })} en ventas`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: '16px', fontSize: '24px', fontWeight: 'bold' }}>Dashboard</h2>
      
      <div ref={containerRef} style={{ minHeight: '80vh' }}>
        {mounted && (
          <Responsive
            className="layout"
            width={width}
            layouts={layouts}
            onLayoutChange={(currentLayout, allLayouts) => setLayouts(allLayouts as any)}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        // @ts-ignore - react-grid-layout types are incomplete in this version
        draggableHandle=".drag-handle"
        style={{ minHeight: '80vh' }}
      >
        <div key="kpi-today" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <div className="drag-handle" style={{ padding: '8px', cursor: 'grab', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            ≡ Mover
          </div>
          <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Ventas del Día</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'hsl(var(--primary))' }}>
              ${Number(stats.ventasHoy).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div key="kpi-month" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <div className="drag-handle" style={{ padding: '8px', cursor: 'grab', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            ≡ Mover
          </div>
          <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Ventas del Mes</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'hsl(var(--success))' }}>
              ${Number(stats.ventasMes).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div key="bar-chart" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <div className="drag-handle" style={{ padding: '8px', cursor: 'grab', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>≡ Mover</span>
            <span>Evolución (Últimos 7 días)</span>
          </div>
          <div style={{ padding: '16px', flex: 1, width: '100%', height: '100%', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartVentas}>
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={(val) => val.split('-').reverse().join('-')} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', borderRadius: '8px' }} labelFormatter={(label) => label.split('-').reverse().join('-')} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div key="pie-chart" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <div className="drag-handle" style={{ padding: '8px', cursor: 'grab', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{flex: 1}}>≡ Mover</span>
            <span style={{flex: 2, textAlign: 'center', fontWeight: 'bold'}}>Top 5 Productos Vendidos</span>
            <div style={{flex: 1, textAlign: 'right'}}>
              <button onClick={() => toggleChartType('topProductos')} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                {chartTypes.topProductos === 'pie' ? '📊 Barra' : '🍩 Circular'}
              </button>
            </div>
          </div>
          <div style={{ padding: '16px', flex: 1, width: '100%', height: '100%', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartTypes.topProductos === 'pie' ? (
                <PieChart>
                  <Pie data={stats.topProductos} cx="50%" cy="50%" innerRadius="55%" outerRadius="75%" paddingAngle={5} dataKey="cantidad" nameKey="nombre">
                    {stats.topProductos.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                </PieChart>
              ) : (
                <BarChart data={stats.topProductos} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="nombre" type="category" width={100} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <Tooltip content={<CustomPieTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="cantidad" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div key="pie-metodos" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <div className="drag-handle" style={{ padding: '8px', cursor: 'grab', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{flex: 1}}>≡ Mover</span>
            <span style={{flex: 2, textAlign: 'center', fontWeight: 'bold'}}>Ingresos por Medio de Pago</span>
            <div style={{flex: 1, textAlign: 'right'}}>
              <button onClick={() => toggleChartType('metodos')} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                {chartTypes.metodos === 'pie' ? '📊 Barra' : '🍩 Circular'}
              </button>
            </div>
          </div>
          <div style={{ padding: '16px', flex: 1, width: '100%', height: '100%', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartTypes.metodos === 'pie' ? (
                <PieChart>
                  <Pie data={stats.chartMetodos} cx="50%" cy="50%" innerRadius="55%" outerRadius="75%" paddingAngle={5} dataKey="total" nameKey="metodo">
                    {stats.chartMetodos?.map((entry: any, index: number) => (
                      <Cell key={`cell-metodo-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomMetodosTooltip />} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                </PieChart>
              ) : (
                <BarChart data={stats.chartMetodos} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="metodo" type="category" width={100} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <Tooltip content={<CustomMetodosTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="total" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div key="pie-vendedores" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <div className="drag-handle" style={{ padding: '8px', cursor: 'grab', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{flex: 1}}>≡ Mover</span>
            <span style={{flex: 2, textAlign: 'center', fontWeight: 'bold'}}>Ingresos por Vendedor</span>
            <div style={{flex: 1, textAlign: 'right'}}>
              <button onClick={() => toggleChartType('vendedores')} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                {chartTypes.vendedores === 'pie' ? '📊 Barra' : '🍩 Circular'}
              </button>
            </div>
          </div>
          <div style={{ padding: '16px', flex: 1, width: '100%', height: '100%', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartTypes.vendedores === 'pie' ? (
                <PieChart>
                  <Pie data={stats.chartVendedores} cx="50%" cy="50%" innerRadius="55%" outerRadius="75%" paddingAngle={5} dataKey="total" nameKey="vendedor">
                    {stats.chartVendedores?.map((entry: any, index: number) => (
                      <Cell key={`cell-vend-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomVendedoresTooltip />} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                </PieChart>
              ) : (
                <BarChart data={stats.chartVendedores} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="vendedor" type="category" width={100} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <Tooltip content={<CustomVendedoresTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="total" fill={COLORS[3]} radius={[0, 4, 4, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </Responsive>
        )}
      </div>
    </div>
  );
}
