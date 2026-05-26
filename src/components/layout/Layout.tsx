import React, { useState, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { Accordion, Spinner } from "react-bootstrap";
import "./Layout.scss";
import { Link, Outlet } from "react-router-dom";
import { Nav, Offcanvas, Button, Image } from "react-bootstrap";
import {
  BsSpeedometer,
  BsGraphUp,
  BsGear,
  BsBoxArrowRight,
  BsList,
  BsCalendarCheck,
  BsShieldCheck,
  BsWallet2,
  BsFillGridFill,
  BsJournalText,
  BsThreeDots
} from "react-icons/bs";
import { GiReceiveMoney, GiPayMoney, GiCash } from "react-icons/gi";
import { GoGoal } from "react-icons/go";
import { TiFlowMerge } from "react-icons/ti";
import { logInfo } from "@/services/logger";
import { MdQuestionMark, MdEmail } from "react-icons/md";
import { BsGithub, BsLinkedin } from "react-icons/bs";
import { useAuth } from "@/hooks/useAuth";
import { FaTools } from "react-icons/fa";
import { FaFireFlameCurved } from "react-icons/fa6";
import DriveSyncButton from "@/components/backups/DriveSyncButton";
import ChatWidget from "@/components/ai/ChatWidget";
import UndoRedoControls from "./UndoRedoControls";
import { IoBookSharp } from "react-icons/io5";

type MenuItem = {
  text: string;
  path?: string;
  icon: React.ReactElement;
  items?: MenuItem[];
};

export default function Layout() {
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(false);
  const handleClose = () => setShowSidebar(false);
  const handleShow = () => setShowSidebar(true);

  const { user, authState, handleSignOut } = useAuth();


  const menuItems: MenuItem[] = [
    { text: "Dashboard", path: "/dashboard", icon: <BsSpeedometer /> },
    {
      text: "Planning",
      icon: <BsJournalText />,
      items: [
        { text: "FIRE", path: "/fire", icon: <FaFireFlameCurved /> },
        { text: "Goals", path: "/goals", icon: <GoGoal /> },
        {
          text: "Networth Projection",
          path: "/networth-projection",
          icon: <BsGraphUp />,
        },
      ],
    },
    {
      text: "Portfolio",
      icon: <BsFillGridFill />,
      items: [
        { text: "Assets", path: "/assets-holdings", icon: <GiCash /> },
        { text: "Liabilities", path: "/liabilities", icon: <GiPayMoney /> },
        { text: "Insurances", path: "/insurances", icon: <BsShieldCheck /> },
      ],
    },
    {
      text: "Cash Flow",
      icon: <BsWallet2 />,
      items: [
        { text: "Income", path: "/income", icon: <GiReceiveMoney /> },
        { text: "Upcoming Expenses", path: "/upcoming-expenses", icon: <BsCalendarCheck /> },
        { text: "Monthly Cash Flow", path: "/cash-flow", icon: <TiFlowMerge /> },
      ],
    },
    {
      text: "Settings & Info",
      icon: <BsThreeDots />,
      items: [
        { text: "Tools", path: "/tools", icon: <FaTools /> },
        { text: "Knowledge Centre", path: "/knowledge-centre", icon: <IoBookSharp /> },
        { text: "Settings", path: "/settings", icon: <BsGear /> },
        { text: "About", path: "/about", icon: <MdQuestionMark /> },
      ],
    },
  ];

  const renderMenu = (onLinkClick?: () => void) => (
    <div className="d-flex flex-column gap-3">
      <Nav className="flex-column gap-1">
        {menuItems.map((menu: MenuItem, idx: number) => {
          if (menu.items) {
            const isActive = menu.items.some(item => location.pathname === item.path);
            return (
              <Accordion 
                flush 
                key={menu.text} 
                className="category-accordion"
                defaultActiveKey={isActive ? String(idx) : undefined}
              >
                <Accordion.Item eventKey={String(idx)} className="bg-transparent border-0">
                  <Accordion.Header className="bg-transparent border-0">
                    <span className="me-2 fs-5 text-secondary">{menu.icon}</span>
                    <span className="fw-bold text-uppercase small opacity-75">{menu.text}</span>
                  </Accordion.Header>
                  <Accordion.Body className="bg-transparent py-0 ps-3">
                    <Nav className="flex-column gap-1 my-1">
                      {menu.items.map((item: MenuItem) => {
                        const isSubActive = location.pathname === item.path;
                        return (
                          <Nav.Item key={item.path}>
                            <Link
                              to={item.path!}
                              className={`nav-link d-flex align-items-center gap-2 py-2 rounded-2 ${
                                isSubActive
                                  ? "bg-primary text-white shadow-sm"
                                  : "text-body-secondary"
                              }`}
                              onClick={onLinkClick}
                            >
                              <span className="nav-icon fs-6">{item.icon}</span>
                              <span>{item.text}</span>
                            </Link>
                          </Nav.Item>
                        );
                      })}
                    </Nav>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            );
          }
          
          const isMainActive = location.pathname === menu.path;
          return (
            <Nav.Item key={menu.path}>
              <Link
                to={menu.path!}
                className={`nav-link d-flex align-items-center gap-2 py-2 px-3 rounded-2 ${
                  isMainActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-body"
                }`}
                onClick={onLinkClick}
              >
                <span className="nav-icon fs-5">{menu.icon}</span>
                <span className={isMainActive ? "fw-medium" : ""}>{menu.text}</span>
              </Link>
            </Nav.Item>
          );
        })}
      </Nav>
      <div className="d-flex justify-content-center gap-2">
        <Button
          variant="outline-primary"
          size="sm"
          href="https://github.com/swapnil-bhamat/Personal-Finance-PWA"
          target="_blank"
          title="GitHub"
        >
          <BsGithub />
        </Button>
        <Button
          variant="outline-primary"
          size="sm"
          href="https://www.linkedin.com/in/swapnil-bhamat"
          target="_blank"
          title="LinkedIn Profile"
        >
          <BsLinkedin />
        </Button>
        <Button
          variant="outline-primary"
          size="sm"
          href="mailto:swapnil.p.bhamat@gmail.com"
          title="Send Email"
        >
          <MdEmail />
        </Button>
      </div>
    </div>
  );

  // Handle authentication states
  useEffect(() => {
    logInfo("Auth state changed", {
      state: authState,
      userEmail: user?.email || "none",
    });
  }, [authState, user]);

  // Redirect to dashboard if authenticated
  if (authState === "signedIn" && user && location.pathname === "/") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="app-layout">
      {/* Sidebar for desktop */}
      <div className="sidebar d-none d-md-block layout-sidebar">
        <div className="py-3 px-3">
          {user && (
            <div className="d-flex align-items-center justify-content-between border-bottom pb-3">
              <div className="d-flex align-items-center gap-2">
                <Image
                  src={user.photoURL!}
                  roundedCircle
                  width={32}
                  height={32}
                  alt={user.displayName!}
                />
                <span className="fw-medium">{user.displayName}</span>
              </div>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleSignOut}
                title="Sign out"
              >
                <BsBoxArrowRight />
              </Button>
            </div>
          )}
          {renderMenu()}
        </div>
      </div>

      {/* Offcanvas sidebar for mobile */}
      <Offcanvas
        show={showSidebar}
        onHide={handleClose}
        placement="start"
        className="layout-sidebar"
      >
        <Offcanvas.Header closeVariant="dark" className="border-bottom">
          {user && (
            <div className="d-flex align-items-center justify-content-between w-100">
              <div
                className="d-flex align-items-center gap-2"
                onClick={handleClose}
              >
                <Image
                  src={user.photoURL!}
                  roundedCircle
                  width={32}
                  height={32}
                  alt={user.displayName!}
                />
                <span className="fw-medium">{user.displayName}</span>
              </div>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleSignOut}
                title="Sign out"
              >
                <BsBoxArrowRight />
              </Button>
            </div>
          )}
        </Offcanvas.Header>
        <Offcanvas.Body>{renderMenu(handleClose)}</Offcanvas.Body>
      </Offcanvas>

      <div className="main-content layout-content d-flex flex-column">
        {(() => {
          const path = location.pathname;
          const allItems = menuItems.flatMap((menu) =>
            menu.items ? menu.items : [menu]
          );
          const current = allItems.find((item) => item.path === path);
          if (current) {
            return (
              <div className="layout-header d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-3 justify-content-md-start">
                  <div className="d-md-none d-flex align-items-start">
                    <Button onClick={handleShow}>
                      <BsList />
                    </Button>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-2 text-primary d-none d-md-block">
                      {current.icon}
                    </span>
                    <h3 className="mb-0 fw-bold text-center text-md-start">
                      {current.text}
                    </h3>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <UndoRedoControls />
                  <DriveSyncButton />
                </div>
              </div>
            );
          }
          return null;
        })()}
        <div className="layout-content-wrapper">
          <Outlet />
        </div>
      </div>
      {authState === "checking" && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-body bg-opacity-50" // just zIndex since Bootstrap doesn't provide a utility for this
          style={{ zIndex: 1050 }}
        >
          <Spinner
            animation="border"
            variant="light"
            role="status"
            className="spinner-border-lg"
          >
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}
      {authState === "signedIn" && user && <ChatWidget />}
    </div>
  );
}
