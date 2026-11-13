import React, { useState } from "react";
import { InputGroup, Form, Button, ButtonGroup, Dropdown } from "react-bootstrap";
import {
  BsSearch,
  BsPlus,
  BsDownload,
  BsGrid,
  BsTable,
  BsThreeDotsVertical,
  BsArrowLeft,
  BsX,
} from "react-icons/bs";

interface SearchInputProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAdd: () => void;
  onDownload?: () => void;
  extraActions?: React.ReactNode;
  title: string;
  viewMode?: "table" | "cards";
  onViewModeToggle?: () => void;
  onViewModeChange?: (mode: "table" | "cards") => void;
}

const CustomMoreToggle = React.forwardRef<
  HTMLButtonElement,
  { onClick: (e: React.MouseEvent) => void }
>(({ onClick }, ref) => (
  <Button
    ref={ref}
    variant="outline-secondary"
    className="d-flex align-items-center justify-content-center p-2"
    style={{ minWidth: "38px", height: "38px" }}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
    title="More options"
    aria-label="More options"
  >
    <BsThreeDotsVertical size={16} />
  </Button>
));

CustomMoreToggle.displayName = "CustomMoreToggle";

export const SearchInput: React.FC<SearchInputProps> = ({
  searchQuery,
  onSearchChange,
  onAdd,
  onDownload,
  extraActions,
  title,
  viewMode,
  onViewModeToggle,
  onViewModeChange,
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(Boolean(searchQuery));

  const handleSelectView = (mode: "table" | "cards") => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else if (onViewModeToggle && viewMode !== mode) {
      onViewModeToggle();
    }
  };

  const handleCloseMobileSearch = () => {
    onSearchChange("");
    setIsMobileSearchOpen(false);
  };

  return (
    <div className="w-100">
      {/* ----------------- MOBILE VIEW (< md) ----------------- */}
      <div className="d-flex d-md-none align-items-center w-100">
        {isMobileSearchOpen || Boolean(searchQuery) ? (
          /* Mobile Active Full-Width Search Bar */
          <div className="d-flex align-items-center gap-2 w-100">
            <Button
              variant="link"
              className="p-1 text-body text-decoration-none d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: "36px", height: "38px" }}
              onClick={handleCloseMobileSearch}
              title="Close search"
              aria-label="Close search"
            >
              <BsArrowLeft size={20} />
            </Button>
            <InputGroup className="flex-grow-1">
              <Form.Control
                type="search"
                autoFocus
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="ps-3"
              />
              {searchQuery && (
                <Button
                  variant="outline-secondary"
                  className="d-flex align-items-center justify-content-center px-2"
                  onClick={() => onSearchChange("")}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <BsX size={20} />
                </Button>
              )}
            </InputGroup>
          </div>
        ) : (
          /* Mobile Default Header: Title + Action Buttons */
          <div className="d-flex align-items-center justify-content-between gap-2 w-100">
            <h5 className="mb-0 fw-bold text-truncate me-auto" title={title}>
              {title}
            </h5>

            <div className="d-flex align-items-center gap-1 flex-shrink-0">
              {/* Extra Actions (e.g. Sync, Info Gap) */}
              {extraActions}

              {/* Search Icon Trigger */}
              <Button
                variant="outline-secondary"
                className="d-flex align-items-center justify-content-center p-2"
                style={{ height: "38px", width: "38px" }}
                onClick={() => setIsMobileSearchOpen(true)}
                title="Search"
                aria-label="Search"
              >
                <BsSearch size={16} />
              </Button>

              {/* Primary Add Button */}
              <Button
                variant="primary"
                className="d-flex align-items-center justify-content-center p-2"
                style={{ height: "38px", width: "38px" }}
                onClick={onAdd}
                title={`Add ${title.replace(/s$/, "")}`}
                aria-label={`Add ${title.replace(/s$/, "")}`}
              >
                <BsPlus size={22} />
              </Button>

              {/* More Dropdown */}
              {onDownload && (
                <Dropdown align="end">
                  <Dropdown.Toggle as={CustomMoreToggle} id="more-actions-dropdown-mobile" />
                  <Dropdown.Menu className="shadow-sm">
                    <Dropdown.Item
                      onClick={onDownload}
                      className="d-flex align-items-center gap-2 py-2"
                    >
                      <BsDownload size={14} />
                      <span>Export as Markdown</span>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ----------------- DESKTOP VIEW (>= md) ----------------- */}
      <div className="d-none d-md-flex align-items-center gap-2 w-100">
        {/* Standalone Search Bar */}
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <InputGroup>
            <InputGroup.Text className="bg-body border-end-0 text-muted ps-3 pe-2">
              <BsSearch size={14} />
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="border-start-0 ps-1"
            />
            {searchQuery && (
              <Button
                variant="outline-secondary"
                className="d-flex align-items-center justify-content-center px-2"
                onClick={() => onSearchChange("")}
                title="Clear search"
                aria-label="Clear search"
              >
                <BsX size={18} />
              </Button>
            )}
          </InputGroup>
        </div>

        {/* Action Controls Toolbar */}
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          {extraActions}

          {(onViewModeToggle || onViewModeChange) && viewMode && (
            <ButtonGroup aria-label="View mode">
              <Button
                variant={viewMode === "cards" ? "primary" : "outline-secondary"}
                className="d-flex align-items-center justify-content-center px-2 py-2"
                style={{ height: "38px", minWidth: "38px" }}
                onClick={() => handleSelectView("cards")}
                title="Card Grid View"
                aria-pressed={viewMode === "cards"}
              >
                <BsGrid size={16} />
              </Button>
              <Button
                variant={viewMode === "table" ? "primary" : "outline-secondary"}
                className="d-flex align-items-center justify-content-center px-2 py-2"
                style={{ height: "38px", minWidth: "38px" }}
                onClick={() => handleSelectView("table")}
                title="Table View"
                aria-pressed={viewMode === "table"}
              >
                <BsTable size={16} />
              </Button>
            </ButtonGroup>
          )}

          <Button
            variant="primary"
            className="d-flex align-items-center gap-1 px-3"
            style={{ height: "38px" }}
            onClick={onAdd}
          >
            <BsPlus size={20} />
            <span>Add</span>
          </Button>

          {onDownload && (
            <Dropdown align="end">
              <Dropdown.Toggle as={CustomMoreToggle} id="more-actions-dropdown-desktop" />
              <Dropdown.Menu className="shadow-sm">
                <Dropdown.Item
                  onClick={onDownload}
                  className="d-flex align-items-center gap-2 py-2"
                >
                  <BsDownload size={14} />
                  <span>Export as Markdown</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  );
};
