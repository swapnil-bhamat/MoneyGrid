import React, { useMemo, useState } from "react";
import { Card, Row, Col, Badge, Button } from "react-bootstrap";
import { toLocalCurrency } from "@/utils/numberUtils";
import { t } from "@/utils/localization";
import {
    FaFlagCheckered,
    FaSeedling,
    FaWalking,
    FaRunning,
    FaPlane,
    FaRocket,
    FaGem,
    FaCheck,
    FaLock,
    FaLeaf,
} from "react-icons/fa";
import { BsDownload } from "react-icons/bs";

function determineLevel(data: any, levels: any[]) {
    if (!levels[0].getMath(data).passed) return 1;

    for (let i = 1; i < levels.length; i++) {
        const math = levels[i].getMath(data);
        if (!math.passed) {
            return levels[i].id;
        }
    }
    return 8;
}

const escapeMarkdownCell = (content: string | number | undefined) =>
    (content ?? "").toString().replace(/\|/g, "\\|").replace(/\n/g, " ");

export default function FinancialFreedomKPI({
    income,
    assets,
    liabilities,
    emergencyFund,
    expenses,
    wants = 0,
    emi = 0,
    retirementAssets = 0,
}: {
    income: number;
    assets: number;
    liabilities: number;
    emergencyFund: number;
    expenses: number;
    wants?: number;
    emi?: number;
    retirementAssets?: number;
}) {
    const data = { income, assets, liabilities, emergencyFund, expenses, wants, emi, retirementAssets };

    // Define detailed levels dynamically so they reference localization dynamically
    const levels = useMemo(() => [
        {
            id: 1,
            label: t.financialFreedom.levels.clarity.label,
            icon: FaFlagCheckered,
            desc: t.financialFreedom.levels.clarity.desc,
            criteria: t.financialFreedom.levels.clarity.criteria,
            getMath: (d: any) => ({
                current: d.income > 0 && d.expenses > 0 ? t.financialFreedom.levels.clarity.tracking : t.financialFreedom.levels.clarity.notTracking,
                target: t.financialFreedom.levels.clarity.tracking,
                label: t.financialFreedom.levels.clarity.currentLabel,
                passed: d.income > 0 && d.expenses > 0,
                remaining: undefined,
                percentage: (d.income > 0 && d.expenses > 0) ? 100 : 0
            })
        },
        {
            id: 2,
            label: t.financialFreedom.levels.solvency.label,
            icon: FaSeedling,
            desc: t.financialFreedom.levels.solvency.desc,
            criteria: t.financialFreedom.levels.solvency.criteria,
            getMath: (d: any) => {
                const pct = d.expenses > 0 ? (d.income / d.expenses) * 100 : (d.income > 0 ? 100 : 0);
                return {
                    current: toLocalCurrency(d.income),
                    target: toLocalCurrency(d.expenses),
                    label: t.financialFreedom.levels.solvency.currentLabel,
                    passed: d.income > d.expenses,
                    remaining: Math.max(0, d.expenses - d.income),
                    percentage: Math.min(100, Math.max(0, pct))
                };
            }
        },
        {
            id: 3,
            label: t.financialFreedom.levels.breathingRoom.label,
            icon: FaWalking,
            desc: t.financialFreedom.levels.breathingRoom.desc,
            criteria: t.financialFreedom.levels.breathingRoom.criteria,
            getMath: (d: any) => {
                const pct = d.liabilities > 0 ? (d.assets / d.liabilities) * 100 : (d.assets > 0 ? 100 : 0);
                return {
                    current: toLocalCurrency(d.assets),
                    target: toLocalCurrency(d.liabilities),
                    label: t.financialFreedom.levels.breathingRoom.currentLabel,
                    passed: d.assets > d.liabilities,
                    remaining: Math.max(0, d.liabilities - d.assets),
                    percentage: Math.min(100, Math.max(0, pct))
                };
            }
        },
        {
            id: 4,
            label: t.financialFreedom.levels.stability.label,
            icon: FaRunning,
            desc: t.financialFreedom.levels.stability.desc,
            criteria: t.financialFreedom.levels.stability.criteria,
            getMath: (d: any) => {
                const target = d.expenses * 3;
                const pct = target > 0 ? (d.emergencyFund / target) * 100 : (d.emergencyFund > 0 ? 100 : 0);
                return {
                    current: toLocalCurrency(d.emergencyFund),
                    target: `${toLocalCurrency(d.expenses)} * 3 = ${toLocalCurrency(target)}`,
                    label: t.financialFreedom.levels.stability.currentLabel,
                    passed: d.emergencyFund >= target,
                    remaining: Math.max(0, target - d.emergencyFund),
                    percentage: Math.min(100, Math.max(0, pct))
                };
            }
        },
        {
            id: 5,
            label: t.financialFreedom.levels.flexibility.label,
            icon: FaPlane,
            desc: t.financialFreedom.levels.flexibility.desc,
            criteria: t.financialFreedom.levels.flexibility.criteria,
            getMath: (d: any) => {
                const target = d.expenses * 6;
                const pct = target > 0 ? (d.emergencyFund / target) * 100 : (d.emergencyFund > 0 ? 100 : 0);
                return {
                    current: toLocalCurrency(d.emergencyFund),
                    target: `${toLocalCurrency(d.expenses)} * 6 = ${toLocalCurrency(target)}`,
                    label: t.financialFreedom.levels.flexibility.currentLabel,
                    passed: d.emergencyFund >= target,
                    remaining: Math.max(0, target - d.emergencyFund),
                    percentage: Math.min(100, Math.max(0, pct))
                };
            }
        },
        {
            id: 6,
            label: t.financialFreedom.levels.leanFire.label,
            icon: FaLeaf,
            desc: t.financialFreedom.levels.leanFire.desc,
            note: t.financialFreedom.levels.leanFire.note,
            criteria: t.financialFreedom.levels.leanFire.criteria,
            getMath: (d: any) => {
                const leanExpenses = Math.max(0, d.expenses - (d.emi || 0));
                const target = leanExpenses * 343;
                const fireAssets = d.retirementAssets || 0;
                const pct = target > 0 ? (fireAssets / target) * 100 : (fireAssets > 0 ? 100 : 0);
                return {
                    current: toLocalCurrency(fireAssets),
                    target: `${toLocalCurrency(leanExpenses)} * 343 = ${toLocalCurrency(target)}`,
                    label: t.financialFreedom.levels.leanFire.currentLabel,
                    passed: fireAssets >= target,
                    remaining: Math.max(0, target - fireAssets),
                    percentage: Math.min(100, Math.max(0, pct))
                };
            }
        },
        {
            id: 7,
            label: t.financialFreedom.levels.independence.label,
            icon: FaRocket,
            desc: t.financialFreedom.levels.independence.desc,
            note: t.financialFreedom.levels.independence.note,
            criteria: t.financialFreedom.levels.independence.criteria,
            getMath: (d: any) => {
                const leanExpenses = Math.max(0, d.expenses - (d.emi || 0));
                const totalMonthly = leanExpenses + (d.wants || 0);
                const target = totalMonthly * 343;
                const fireAssets = d.retirementAssets || 0;
                const pct = target > 0 ? (fireAssets / target) * 100 : (fireAssets > 0 ? 100 : 0);
                return {
                    current: toLocalCurrency(fireAssets),
                    target: `${toLocalCurrency(totalMonthly)} * 343 = ${toLocalCurrency(target)}`,
                    label: t.financialFreedom.levels.independence.currentLabel,
                    passed: fireAssets >= target,
                    remaining: Math.max(0, target - fireAssets),
                    percentage: Math.min(100, Math.max(0, pct))
                };
            }
        },
        {
            id: 8,
            label: t.financialFreedom.levels.abundantWealth.label,
            icon: FaGem,
            desc: t.financialFreedom.levels.abundantWealth.desc,
            note: t.financialFreedom.levels.abundantWealth.note,
            criteria: t.financialFreedom.levels.abundantWealth.criteria,
            getMath: (d: any) => {
                const leanExpenses = Math.max(0, d.expenses - (d.emi || 0));
                const totalMonthly = leanExpenses + (d.wants || 0);
                const target = totalMonthly * 600;
                const fireAssets = d.retirementAssets || 0;
                const pct = target > 0 ? (fireAssets / target) * 100 : (fireAssets > 0 ? 100 : 0);
                return {
                    current: toLocalCurrency(fireAssets),
                    target: `${toLocalCurrency(totalMonthly)} * 600 = ${toLocalCurrency(target)}`,
                    label: t.financialFreedom.levels.abundantWealth.currentLabel,
                    passed: fireAssets >= target,
                    remaining: Math.max(0, target - fireAssets),
                    percentage: Math.min(100, Math.max(0, pct))
                };
            }
        },
    ], []);

    const currentLevelId = useMemo(() => determineLevel(data, levels), [data, levels]);

    // State for interaction
    const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);

    // If nothing selected, show current level logic
    const activeDisplayId = selectedLevelId || currentLevelId;
    const activeLevelInfo = levels.find(l => l.id === activeDisplayId) || levels[0];
    const activeMath = activeLevelInfo.getMath(data);
    const isSelectedCompleted = activeDisplayId < currentLevelId;
    const isSelectedCurrent = activeDisplayId === currentLevelId;

    const handleDownload = () => {
        const headers = ["Level", "Status", "Name", "Criteria", "Current", "Target", "Remaining", "Progress"];
        const separators = headers.map(() => "---");

        const rows = levels.map((level) => {
            const math = level.getMath(data);
            const status = level.id < currentLevelId
                ? t.financialFreedom.completed
                : level.id === currentLevelId
                    ? t.financialFreedom.inProgress
                    : t.financialFreedom.locked;
            const remaining = math.remaining !== undefined
                ? toLocalCurrency(math.remaining)
                : "";
            const progress = `${(math.percentage || 0).toFixed(1)}%`;

            return [
                level.id,
                status,
                level.label,
                level.criteria,
                math.current,
                math.target,
                remaining,
                progress,
            ];
        });

        const markdown = [
            `# ${t.financialFreedom.title}`,
            "",
            `${t.financialFreedom.currentLevel}: ${currentLevelId}`,
            "",
            `| ${headers.map(escapeMarkdownCell).join(" | ")} |`,
            `| ${separators.join(" | ")} |`,
            ...rows.map((row) => `| ${row.map(escapeMarkdownCell).join(" | ")} |`),
        ].join("\n");

        const blob = new Blob([markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Financial_Freedom_Tracker_${new Date().toISOString().split("T")[0]}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Card className="mb-4 shadow border-0 overflow-hidden">
            <div
                className="position-absolute w-100 h-100"
                style={{
                    background: `linear-gradient(135deg, ${getGradient(currentLevelId)})`,
                    opacity: 0.1,
                    pointerEvents: "none"
                }}
            />

            <Card.Header as="h5" className="bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <span>{t.financialFreedom.title}</span>
                    <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-primary rounded-pill">{t.financialFreedom.currentLevel}: {currentLevelId}</span>
                        <Button
                            variant="outline-info"
                            size="sm"
                            className="d-flex align-items-center"
                            onClick={handleDownload}
                            title={t.financialFreedom.downloadLabel}
                            aria-label={t.financialFreedom.downloadLabel}
                        >
                            <BsDownload size={18} />
                        </Button>
                    </div>
                </div>
            </Card.Header>

            <Card.Body className="px-3 px-md-4 pb-4 pt-2">
                {/* Responsive Stepper Container */}
                <div className="position-relative mb-5 mx-0 mx-md-2" style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '24px' }}>
                    <div style={{ minWidth: '600px' }}> {/* Force width for horizontal scroll on mobile */}
                        {/* Steps with Flex Connectors */}
                        <div className="d-flex align-items-center justify-content-between position-relative" style={{ zIndex: 1 }}>
                            {levels.map((level, index) => {
                                const isCompleted = level.id < currentLevelId;
                                const isCurrent = level.id === currentLevelId;
                                const isFuture = level.id > currentLevelId;
                                const isSelected = level.id === activeDisplayId;
                                const isLast = index === levels.length - 1;

                                // Determine connector color (to the right of this node)
                                // If this node is completed, and the NEXT node is at least current (or completed), line is green/primary.
                                // Actually, simpler: line is active if the *next* node is reached (<= current).
                                const nextNodeReached = (index + 1 < levels.length) && (levels[index + 1].id <= currentLevelId);

                                return (
                                    <React.Fragment key={level.id}>
                                        <div
                                            className="text-center position-relative"
                                            style={{ cursor: 'pointer', zIndex: 2 }} // Ensure nodes are above lines if overlap (though flex shouldn't overlap)
                                            onClick={() => setSelectedLevelId(level.id)}
                                        >
                                            <div
                                                className={`
                                            rounded-circle d-flex align-items-center justify-content-center shadow-sm transition-all
                                            ${isCurrent ? 'bg-primary text-white ring-4' : ''}
                                            ${isCompleted ? 'bg-success text-white' : ''}
                                            ${isFuture ? 'bg-body-secondary text-muted border' : ''}
                                            ${isSelected && !isCurrent ? 'ring-2-primary' : ''}
                                        `}
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    transition: 'all 0.3s ease',
                                                    border: isSelected ? '2px solid var(--bs-primary)' : isFuture ? '2px solid var(--bs-border-color)' : 'none',
                                                }}
                                            >
                                                {isCompleted ? <FaCheck size={14} /> :
                                                    isCurrent ? <level.icon size={20} /> :
                                                        <FaLock size={12} />}
                                            </div>

                                            <div className={`small fw-bold ${isCurrent || isSelected ? 'text-primary' : 'text-muted'} text-nowrap position-absolute`}
                                                style={{
                                                    transform: 'translateX(-50%)',
                                                    left: '50%',
                                                    top: '45px',
                                                    width: '100px',
                                                    textAlign: 'center',
                                                    opacity: (isCurrent || isSelected) ? 1 : 0.6,
                                                    pointerEvents: 'none'
                                                }}>
                                                {(isCurrent || isSelected) ? level.label : ''}
                                            </div>
                                        </div>

                                        {!isLast && (
                                            <div
                                                className={`flex-grow-1 mx-2 rounded ${nextNodeReached ? 'bg-primary' : 'bg-secondary-subtle'}`}
                                                style={{ height: '4px', transition: 'background-color 0.5s ease' }}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Selected Level Detail Panel */}
                <div className="bg-body-tertiary rounded-3 p-4 mt-4 transition-all animation-fade-in">
                    <Row className="align-items-center">
                        <Col xs={12} md={8}>
                            <h4 className="fw-bold mb-1 d-flex align-items-center gap-2">
                                {activeLevelInfo.icon && <activeLevelInfo.icon className="text-primary" />}
                                {activeLevelInfo.label}
                                {isSelectedCompleted ?
                                    <Badge bg="success" className="ms-2" style={{ fontSize: '0.6em' }}>{t.financialFreedom.completed}</Badge> :
                                    (isSelectedCurrent ?
                                        <Badge bg="primary" className="ms-2" style={{ fontSize: '0.6em' }}>{t.financialFreedom.inProgress}</Badge> :
                                        <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.6em' }}>{t.financialFreedom.locked}</Badge>
                                    )
                                }
                            </h4>
                            <p className="text-muted mb-3 mb-md-0">{activeLevelInfo.desc}</p>
                            {(activeLevelInfo as any).note && (
                                <div className="alert alert-info mt-3 py-2 px-3 small border-0 mb-0 d-flex align-items-start shadow-sm" style={{ backgroundColor: 'rgba(13, 110, 253, 0.08)' }}>
                                    <div><strong>{t.financialFreedom.noteLabel}:</strong> {(activeLevelInfo as any).note}</div>
                                </div>
                            )}
                        </Col>
                        <Col xs={12} md={4}>
                            <div className="border-start-md px-md-3">
                                <div className="text-uppercase text-muted fw-bold small mb-2">{activeMath.label}</div>
                                <div className="d-flex flex-column align-items-end mb-2">
                                    {activeMath.passed ? (
                                        <div className="fw-bold fs-4 text-success">{activeMath.current}</div>
                                    ) : (
                                        <div className="fw-bold fs-4 text-primary">
                                            {activeMath.remaining !== undefined ? (
                                                <>
                                                    <span className="small text-muted me-2">{t.financialFreedom.remaining}:</span>
                                                    {toLocalCurrency(activeMath.remaining)}
                                                </>
                                            ) : activeMath.current}
                                        </div>
                                    )}
                                    <div className="small text-muted text-end">{t.financialFreedom.target}: {activeMath.target}</div>
                                </div>
                                {/* Simple visual bar for this specific metric */}
                                {typeof activeMath.current === 'string' && activeMath.current.includes("Tracking") ? null : (
                                    <div className="mt-2">
                                        <div className="d-flex justify-content-between align-items-center mb-1 small text-muted">
                                            <span>{t.financialFreedom.progress}</span>
                                            <span className="fw-bold">{activeMath.percentage?.toFixed(1) || 0}%</span>
                                        </div>
                                        <div className="progress" style={{ height: '8px' }}>
                                            <div
                                                className={`progress-bar ${activeMath.passed ? 'bg-success' : 'bg-primary'}`}
                                                role="progressbar"
                                                style={{ width: `${activeMath.percentage || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                                <div className="small mt-1 text-end">
                                    {activeMath.passed ? (
                                        <span className="text-success fw-bold"><FaCheck className="me-1" />{t.financialFreedom.criteriaMet}</span>
                                    ) : (
                                        <span className="text-warning-emphasis fw-bold">{t.financialFreedom.targetNotMet}</span>
                                    )}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            </Card.Body>
        </Card>
    );
}

function getGradient(level: number) {
    if (level <= 2) return "rgba(13, 110, 253, 0.2), rgba(255, 255, 255, 0)";
    if (level <= 4) return "rgba(25, 135, 84, 0.2), rgba(255, 255, 255, 0)";
    if (level <= 7) return "rgba(255, 193, 7, 0.2), rgba(255, 255, 255, 0)";
    return "rgba(220, 53, 69, 0.1), rgba(255, 255, 255, 0)";
}
