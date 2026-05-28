import { useState } from "react";
import { Container, Tab, Tabs, Row, Col } from "react-bootstrap";
import REITsPage from "@/pages/accounts/REITsPage";
import GoldRateCard from "@/components/widgets/GoldRateCard";
import GoldCalculator from "@/components/widgets/GoldCalculator";
import SwpPage from "@/pages/analytics/SwpPage";
import { PiHandWithdraw } from "react-icons/pi";
import { FaBuilding } from "react-icons/fa";
import { AiFillGolden } from "react-icons/ai";
import { t } from "@/utils/localization";

export default function ToolsPage() {
  const [key, setKey] = useState<string>("reits");

  return (
    <Container fluid className="flex-grow-1 overflow-auto">
      <Tabs
        id="tool-tabs"
        activeKey={key}
        onSelect={(k) => setKey(k || "reits")}
        className="mb-4 flex-nowrap flex-md-wrap overflow-x-auto overflow-y-hidden py-1 align-items-stretch"
      >
        <Tab eventKey="reits" title={<><FaBuilding className="me-2"/>{t.dashboard.reitsSimulator || "REITs Simulator"}</>} tabClassName="h-100 d-flex align-items-center">
          <REITsPage />
        </Tab>
        <Tab eventKey="swp" title={<><PiHandWithdraw className="me-2"/>{t.dashboard.swpCalculator || "SWP Calculator"}</>} tabClassName="h-100 d-flex align-items-center">
            <SwpPage />
        </Tab>
        <Tab eventKey="commodities" title={<><AiFillGolden className="me-2"/>{t.dashboard.commodityRates || "Commodity Rates"}</>} tabClassName="h-100 d-flex align-items-center">
            <Row className="g-4">
                <Col md={6}>
                    <GoldRateCard />
                </Col>
                <Col md={6}>
                    <GoldCalculator />
                </Col>
            </Row>
        </Tab>
      </Tabs>
    </Container>
  );
}
