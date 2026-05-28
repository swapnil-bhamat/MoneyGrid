import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { AssetHolding } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";
import FormModal from "@/components/common/FormModal";
import { Form } from "react-bootstrap";
import { toLocalCurrency, getActiveCurrency } from "@/utils/numberUtils";
import AmountInput from "@/components/common/AmountInput";
import FormSelect from "@/components/common/FormSelect";
import { getDynamicBgClass } from "@/utils/colorUtils";
import { getKeywordDetails } from "@/utils/keywordRegistry";
import { t } from "@/utils/localization";

import { fetchGoldData } from "@/services/marketData";

interface AssetHoldingFormProps {
  show: boolean;
  onHide: () => void;
  item?: AssetHolding;
  onSave: (item: AssetHolding | Partial<AssetHolding>) => Promise<void>;
}

function AssetHoldingForm({
  item,
  onSave,
  onHide,
  show,
}: AssetHoldingFormProps) {
  const [assetClasses_id, setAssetClassesId] = useState(
    item?.assetClasses_id ?? 0
  );
  const [assetSubClasses_id, setAssetSubClassesId] = useState(
    item?.assetSubClasses_id ?? 0
  );
  const [goals_id, setGoalsId] = useState<number | null>(item?.goals_id ?? null);
  const [holders_id, setHoldersId] = useState(item?.holders_id ?? 0);
  const [assetDetail, setAssetDetail] = useState(item?.assetDetail ?? "");
  const [existingAllocation, setExistingAllocation] = useState(
    item?.existingAllocation ?? 0
  );
  const [sip, setSip] = useState(item?.sip ?? 0);
  const [sipTypes_id, setSipTypesId] = useState(item?.sipTypes_id ?? 0);
  const [buckets_id, setBucketsId] = useState(item?.buckets_id ?? 0);
  const [comments, setComments] = useState(item?.comments ?? "");

  // Market Link State
  const [marketType, setMarketType] = useState<"GOLD" | "NONE">(
    (item?.marketType as "GOLD" | "NONE") ?? "NONE"
  );
  const [grams, setGrams] = useState(item?.grams ?? 0);
  const [goldPurity, setGoldPurity] = useState<"22K" | "24K">(
    item?.goldPurity ?? "24K"
  );
  
  const [goldRates, setGoldRates] = useState<{ "22K": number; "24K": number } | null>(null);

  const assetClasses = useLiveQuery(() => db.assetClasses.toArray()) ?? [];
  const assetSubClasses =
    useLiveQuery(() => db.assetSubClasses.toArray()) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];
  const sipTypes = useLiveQuery(() => db.sipTypes.toArray()) ?? [];
  const buckets = useLiveQuery(() => db.buckets.toArray()) ?? [];

  // Fetch Gold Rates on mount
  useEffect(() => {
    const loadGold = async () => {
      const gold = await fetchGoldData();
      if (gold) {
        setGoldRates({
          "24K": gold.price_gram_24k,
          "22K": gold.price_gram_22k,
        });
      }
    };
    loadGold();
  }, []);

  // Recalculate value
  useEffect(() => {
    if (marketType === "GOLD" && goldRates && grams > 0) {
      const rate = goldRates[goldPurity];
      setExistingAllocation(Number((grams * rate).toFixed(2)));
    }
  }, [marketType, grams, goldRates, goldPurity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      assetClasses_id,
      assetSubClasses_id,
      goals_id,
      holders_id,
      assetDetail,
      existingAllocation,
      sip,
      sipTypes_id,
      buckets_id,
      comments,
      marketType: marketType === "NONE" ? undefined : marketType,
      grams: marketType === "GOLD" ? grams : undefined,
      goldPurity: marketType === "GOLD" ? goldPurity : undefined,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? t.assets.editAsset : t.assets.addAsset}
      isValid={!!assetClasses_id}
    >
      <FormSelect
        controlId="formAssetClass"
        label={t.assets.class}
        value={assetClasses_id}
        onChange={(e) => {
          setAssetClassesId(Number(e.target.value));
          setAssetSubClassesId(0);
        }}
        options={assetClasses}
        defaultText={t.common.selectAssetClass || "Select Class"}
      />

      <FormSelect
        controlId="formAssetSubClass"
        label={t.assets.subClass}
        value={assetSubClasses_id}
        onChange={(e) => setAssetSubClassesId(Number(e.target.value))}
        options={assetSubClasses.filter(
          (asc) => asc.assetClasses_id === assetClasses_id
        )}
        defaultText={t.common.selectAssetSubClass || "Select Sub Class"}
      />
      
      {/* Market Link Section */}
      <div className="p-3 mb-3 rounded border">
        <h6 className="mb-3">{t.assets.marketLink}</h6>
        <FormSelect
          controlId="formMarketType"
          label={t.assets.linkToMarket}
          value={marketType}
          onChange={(e) => setMarketType(e.target.value as "GOLD" | "NONE")}
          options={[
            { id: "NONE", name: t.assets.noneManualEntry || "None (Manual Entry)" },
            { id: "GOLD", name: t.assets.gold || "Gold" },
          ]}
          defaultText={t.assets.selectLinkType || "Select Link Type"}
        />

        {marketType === "GOLD" && (
          <>
            <FormSelect
              controlId="formGoldPurity"
              label={t.assets.purity}
              value={goldPurity}
              onChange={(e) => setGoldPurity(e.target.value as "22K" | "24K")}
              options={[
                { id: "24K", name: t.assets.gold24k || "24K (99.9%)" },
                { id: "22K", name: t.assets.gold22k || "22K (91.6%)" },
              ]}
              defaultText={t.assets.selectPurity || "Select Purity"}
            />

            <Form.Group className="mb-3" controlId="formGrams">
                <Form.Label>{t.assets.grams} {goldRates && <small className="text-muted">(Rate: {getActiveCurrency().symbol}{goldRates[goldPurity]?.toFixed(2)}/g)</small>}</Form.Label>
                <Form.Control
                type="number"
                step="0.01"
                value={grams}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setGrams(Number(e.target.value))
                }
                />
            </Form.Group>
          </>
        )}
      </div>

      <Form.Group className="mb-3" controlId="formExistingAllocation">
        <Form.Label>{t.assets.existingAllocation}</Form.Label>
        <AmountInput
          value={existingAllocation}
          readOnly={marketType !== "NONE"}
          className={marketType !== "NONE" ? "bg-secondary-subtle" : ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setExistingAllocation(Number(e.target.value))
          }
        />
        {marketType !== "NONE" && <Form.Text className="text-muted">{t.assets.autoCalculatedText || "Auto-calculated based on market rate"}</Form.Text>}
      </Form.Group>

      <FormSelect
        controlId="formGoal"
        label={t.assets.goal}
        value={goals_id ?? ""}
        onChange={(e) =>
          setGoalsId(e.target.value ? Number(e.target.value) : null)
        }
        options={goals}
        defaultText={t.common.none || "None"}
      />

      <FormSelect
        controlId="formHolder"
        label={t.assets.holder}
        value={holders_id}
        onChange={(e) => setHoldersId(Number(e.target.value))}
        options={holders}
        defaultText={t.common.selectHolder || "Select Holder"}
      />

      <Form.Group className="mb-3" controlId="formAssetDetail">
        <Form.Label>{t.assets.detail}</Form.Label>
        <Form.Control
          type="text"
          value={assetDetail}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setAssetDetail(e.target.value)
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formSIP">
        <Form.Label>{t.assets.sipAmount}</Form.Label>
        <AmountInput
          value={sip}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSip(Number(e.target.value))
          }
        />
      </Form.Group>

      <FormSelect
        controlId="formSIPType"
        label={t.assets.sipType}
        value={sipTypes_id}
        onChange={(e) => setSipTypesId(Number(e.target.value))}
        options={sipTypes}
        defaultText={t.common.selectSipType || "Select SIP Type"}
      />

      <FormSelect
        controlId="formBucket"
        label={t.assets.swpBucket}
        value={buckets_id}
        onChange={(e) => setBucketsId(Number(e.target.value))}
        options={buckets}
        defaultText={t.common.selectSwpBucket || "Select SWP Bucket"}
      />

      <Form.Group className="mb-3" controlId="formComments">
        <Form.Label>{t.common.comments}</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          value={comments}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setComments(e.target.value)
          }
        />
      </Form.Group>
    </FormModal>
  );
}

export default function AssetsHoldingsPage() {
  const assetsHoldings = useLiveQuery(() => db.assetsHoldings.toArray()) ?? [];
  const assetClasses = useLiveQuery(() => db.assetClasses.toArray()) ?? [];
  const assetSubClasses =
    useLiveQuery(() => db.assetSubClasses.toArray()) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];
  const sipTypes = useLiveQuery(() => db.sipTypes.toArray()) ?? [];
  const buckets = useLiveQuery(() => db.buckets.toArray()) ?? [];

  const handleAdd = async (holding: Partial<AssetHolding>) => {
    await db.assetsHoldings.add(holding as AssetHolding);
  };

  const handleEdit = async (holding: AssetHolding) => {
    await db.assetsHoldings.put(holding);
  };

  const handleDelete = async (holding: AssetHolding) => {
    await db.assetsHoldings.delete(holding.id);
  };

  const getAssetClassName = (id: number) => {
    const assetClass = assetClasses.find((ac) => ac.id === id);
    return assetClass?.name ?? "";
  };

  const getAssetSubClassName = (id: number) => {
    const assetSubClass = assetSubClasses.find((asc) => asc.id === id);
    return assetSubClass?.name ?? "";
  };

  const getGoalName = (id: number | null) => {
    if (!id) return t.common.none || "None";
    const goal = goals.find((g) => g.id === id);
    return goal?.name ?? "";
  };

  const getHolderName = (id: number) => {
    const holder = holders.find((h) => h.id === id);
    return holder?.name ?? "";
  };

  const getSipTypeName = (id: number) => {
    const sipType = sipTypes.find((st) => st.id === id);
    return sipType?.name ?? "";
  };

  const getBucketName = (id: number) => {
    const bucket = buckets.find((b) => b.id === id);
    return bucket?.name ?? "";
  };

  return (
    <BasePage<AssetHolding>
      title={t.assets.title}
      data={[...assetsHoldings].sort((a, b) => (a.assetClasses_id || 0) - (b.assetClasses_id || 0))}
      groupBy={(item) => {
        const name = getAssetClassName(item.assetClasses_id);
        const details = getKeywordDetails(name);
        return {
          key: String(item.assetClasses_id),
          label: name ? `${details.icon} ${name}` : (t.assets.unknownClass || "Unknown Class")
        };
      }}
      groupSort={(a, b) => Number(a) - Number(b)}
      groupRightLabel={(items) => toLocalCurrency(items.reduce((sum, item) => sum + item.existingAllocation, 0))}
      columns={[
        { field: "assetDetail", headerName: t.assets.detail },
        {
          field: "assetSubClasses_id",
          headerName: t.assets.subClass,
          renderCell: (item) => getAssetSubClassName(item.assetSubClasses_id),
        },
        {
          field: "goals_id",
          headerName: t.assets.goal,
          renderCell: (item) => getGoalName(item.goals_id),
        },
        {
          field: "holders_id",
          headerName: t.assets.holder,
          renderCell: (item) => getHolderName(item.holders_id),
        },
        {
          field: "marketType",
          headerName: t.common.quantity,
          renderCell: (item) => {
            if (item.marketType === "GOLD" && item.grams) {
              return `${item.grams} g`;
            }
            return "-";
          },
        },
        {
          field: "existingAllocation",
          headerName: t.assets.existingAllocation,
          renderCell: (item) => toLocalCurrency(item.existingAllocation),
        },
        {
          field: "sip",
          headerName: t.assets.sipAmount,
          renderCell: (item) => toLocalCurrency(item.sip),
        },
        {
          field: "sipTypes_id",
          headerName: t.assets.sipType,
          renderCell: (item) => getSipTypeName(item.sipTypes_id),
        },
        {
          field: "buckets_id",
          headerName: t.assets.swpBucket,
          renderCell: (item) => getBucketName(item.buckets_id),
        },
        { field: "comments", headerName: t.common.additionalInfo },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={AssetHoldingForm}
      getRowClassName={(item) => getDynamicBgClass(item.assetClasses_id)}
    />
  );
}
