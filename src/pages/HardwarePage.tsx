import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "../components/StatusBadge";
import { Empty, ErrorBox, Loading } from "../components/Feedback";
import { useDevices } from "../hooks/queries";
import { stageLabels, type Device } from "../lib/api";
import {
  ChevronRight,
  List,
  Cpu,
  LayoutGrid,
  Monitor,
  Plus,
  RefreshCw,
} from "lucide-react";

function batteryLabel(battery: Device["battery_percent"]) {
  return typeof battery === "number" && battery >= 0 && battery <= 100
    ? `${battery}%`
    : undefined;
}

function DeviceSpecs({ device }: { device: Device }) {
  const specs = [
    ["当前版本", device.version],
    ["剩余电量", batteryLabel(device.battery_percent)],
    ["芯片型号", device.chip_model],
    ["产品型号", device.product_model],
  ] as const;

  return (
    <dl className="device-specs">
      {specs.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className="mono">
            {(typeof value === "string" && value.trim()) || <span aria-label="未上报" title="未上报">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function HardwarePage() {
  const result = useDevices();
  const [filter, setFilter] = useState("all");
  const [compact, setCompact] = useState(
    () => localStorage.getItem("tee-device-view") === "compact",
  );
  const devices = result.data?.devices || [];
  const filteredDevices = devices.filter((d) => {
    if (filter === "idle")
      return !d.busy && d.state !== "offline" && !d.uncertain;
    if (filter === "busy") return d.busy;
    if (filter === "offline") return d.state === "offline";
    return true;
  });

  function changeDeviceView(next: boolean) {
    setCompact(next);
    localStorage.setItem("tee-device-view", next ? "compact" : "cards");
  }

  return (
    <>
      <div className="hardware-overview panel">
        <div className="host-icon">
          <Monitor size={24} aria-hidden="true" />
        </div>
        <div>
          <h3>{result.data?.ssh_host || "设备主机"}</h3>
          <p>SSH 设备资源池</p>
        </div>
        <div className="host-stat">
          <strong>{devices.length}</strong>
          <span>全部设备</span>
        </div>
        <div className="host-stat">
          <strong className="green">
            {
              devices.filter(
                (d) => !d.busy && d.state !== "offline" && !d.uncertain,
              ).length
            }
          </strong>
          <span>可用设备</span>
        </div>
        <div className="host-stat">
          <strong className="blue">
            {devices.filter((d) => d.busy).length}
          </strong>
          <span>正在使用</span>
        </div>
        <span className="subtle host-update">
          <span className="online-dot" />每 7 秒自动刷新
          <br />
          {result.data?.server_time}
        </span>
      </div>
      <ErrorBox error={result.error || result.data?.error} />
      <div className="device-heading">
        <div className="filter-tabs">
          <div>
            {[
              ["all", "全部设备"],
              ["idle", "可用"],
              ["busy", "占用中"],
              ["offline", "离线"],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="content-actions">
          <div className="device-view" role="group" aria-label="设备视图">
            <button
              aria-pressed={!compact}
              onClick={() => changeDeviceView(false)}
            >
              <LayoutGrid size={14} aria-hidden="true" />
              卡片
            </button>
            <button aria-pressed={compact} onClick={() => changeDeviceView(true)}>
              <List size={14} aria-hidden="true" />
              紧凑
            </button>
          </div>
          <button className="button" onClick={() => result.refetch()}>
            <RefreshCw size={16} aria-hidden="true" className={result.isFetching ? "spin" : ""} />
            刷新设备
          </button>
          <Link to="/submit" className="button primary cta">
            <Plus size={16} aria-hidden="true" />
            发布任务
          </Link>
        </div>
      </div>
      {result.isLoading ? (
        <Loading />
      ) : filteredDevices.length === 0 ? (
        <Empty text="暂无匹配设备" />
      ) : (
        <div
          className={compact ? "devices-grid devices-compact" : "devices-grid"}
        >
          {filteredDevices.map((d) => {
            const offline = d.state === "offline";
            const availability = d.uncertain
              ? "uncertain"
              : d.busy
                ? "busy"
                : offline
                  ? "offline"
                  : "idle";
            const taskLink = d.busy && d.busy_by && (
              <Link to="/tasks/$runId" params={{ runId: d.busy_by }} className="device-link">
                {d.busy_by}
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
            );
            const protocol = !offline && <span className="device-protocol">{d.state.toUpperCase()}</span>;
            if (compact) {
              return (
                <section className={`panel device-row${offline ? " offline-device" : ""}`} key={d.sn}>
                  <div className="device-row-identity">
                    <h3 className="mono">{d.sn}</h3>
                    {protocol}
                  </div>
                  <div className="device-row-status"><Badge status={availability} /></div>
                  <div className="device-row-battery">
                    <span>电量</span>
                    <strong>{batteryLabel(d.battery_percent) ?? "—"}</strong>
                  </div>
                  {taskLink}
                </section>
              );
            }
            return (
              <section
                className={`panel device-card ${offline ? "offline-device" : ""}`}
                key={d.sn}
              >
                <div className="device-card-top">
                  <span className="device-icon">
                    <Cpu size={24} aria-hidden="true" />
                  </span>
                  <h3 className="mono">{d.sn}</h3>
                  {protocol}
                </div>
                {d.raw_state &&
                  d.raw_state.toLowerCase() !== d.state.toLowerCase() && (
                    <p className="device-raw-state">{d.raw_state}</p>
                  )}
                <div className="device-status">
                  <Badge status={availability} />
                  {d.busy && d.busy_stage && (
                    <strong>{stageLabels[d.busy_stage] || d.busy_stage}</strong>
                  )}
                </div>
                <DeviceSpecs device={d} />
                {taskLink}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
