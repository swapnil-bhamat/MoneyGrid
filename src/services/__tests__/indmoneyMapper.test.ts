import { describe, it, expect } from "vitest";
import {
  normalizeName,
  parseINDMoneyPayload,
  resolveHolderId,
  generateReconciliationDiff,
} from "@/services/indmoneyMapper";
import { AssetHolding, Holder } from "@/infrastructure/db/db.types";

describe("INDmoney Mapper Service", () => {
  const mockHolders: Holder[] = [
    { id: 1, name: "Swapnil" },
    { id: 2, name: "Sonu" },
    { id: 3, name: "Swastika" },
    { id: 4, name: "Aai" },
  ];

  const mockHoldings: AssetHolding[] = [
    {
      id: 1,
      assetDetail: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
      existingAllocation: 2545000,
      assetClasses_id: 1,
      assetSubClasses_id: 1,
      goals_id: 3,
      holders_id: 1,
      sip: 23500,
      sipTypes_id: 1,
      buckets_id: 2,
      comments: "Check https://www.indmoney.com/",
      units: 25999.999,
      schemeCode: "122639",
    },
    {
      id: 2,
      assetDetail: "Kotak Large & Midcap Fund - Direct- Growth",
      existingAllocation: 1538000,
      assetClasses_id: 1,
      assetSubClasses_id: 1,
      goals_id: 3,
      holders_id: 1,
      sip: 11750,
      sipTypes_id: 1,
      buckets_id: 2,
      comments: "",
      units: 3413,
      schemeCode: "120158",
    },
    {
      id: 3,
      assetDetail: "Franklin India ELSS Tax Saver Fund - Direct - Growth",
      existingAllocation: 288000,
      assetClasses_id: 1,
      assetSubClasses_id: 1,
      goals_id: 3,
      holders_id: 1,
      sip: 0,
      sipTypes_id: 1,
      buckets_id: 2,
      comments: "",
      units: 170.211,
      schemeCode: "118540",
    },
    {
      id: 4,
      assetDetail: "Kotak Midcap Fund - Direct Plan - Growth",
      existingAllocation: 157000,
      assetClasses_id: 1,
      assetSubClasses_id: 1,
      goals_id: 3,
      holders_id: 2,
      sip: 12000,
      sipTypes_id: 1,
      buckets_id: 2,
      comments: "",
      units: 419.433,
      schemeCode: "119775",
    },
    {
      id: 5,
      assetDetail: "Parag Parikh ELSS Tax Saver Fund- Direct Growth",
      existingAllocation: 493000,
      assetClasses_id: 1,
      assetSubClasses_id: 1,
      goals_id: 3,
      holders_id: 2,
      sip: 0,
      sipTypes_id: 2,
      buckets_id: 2,
      comments: "",
      units: 15555.33,
      schemeCode: "147481",
    },
    {
      id: 6,
      assetDetail: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
      existingAllocation: 248000,
      assetClasses_id: 1,
      assetSubClasses_id: 1,
      goals_id: 3,
      holders_id: 2,
      sip: 4000,
      sipTypes_id: 2,
      buckets_id: 2,
      comments: "",
      units: 2443.07,
      schemeCode: "122639",
    },
    {
      id: 7,
      assetDetail: "SBI Pension Fund ( NPS )",
      existingAllocation: 179329,
      assetClasses_id: 1,
      assetSubClasses_id: 1,
      goals_id: 3,
      holders_id: 1,
      sip: 0,
      sipTypes_id: 1,
      buckets_id: 2,
      comments: "",
    },
    {
      id: 8,
      assetDetail: "EPF",
      existingAllocation: 1875122,
      assetClasses_id: 2,
      assetSubClasses_id: 6,
      goals_id: 2,
      holders_id: 1,
      sip: 25174,
      sipTypes_id: 1,
      buckets_id: 3,
      comments: "",
    },
    {
      id: 9,
      assetDetail: "SBI",
      existingAllocation: 1204180,
      assetClasses_id: 2,
      assetSubClasses_id: 9,
      goals_id: 1,
      holders_id: 1,
      sip: 0,
      sipTypes_id: 1,
      buckets_id: 3,
      comments: "",
    },
    {
      id: 11,
      assetDetail: "HDFC SSY A/C",
      existingAllocation: 159059,
      assetClasses_id: 2,
      assetSubClasses_id: 12,
      goals_id: 4,
      holders_id: 1,
      sip: 0,
      sipTypes_id: 1,
      buckets_id: 3,
      comments: "",
    },
    {
      id: 18,
      assetDetail: "24 K Gold Jewellery",
      existingAllocation: 1832980.75,
      assetClasses_id: 4,
      assetSubClasses_id: 16,
      goals_id: 2,
      holders_id: 2,
      sip: 0,
      sipTypes_id: 1,
      buckets_id: 0,
      comments: "",
      marketType: "GOLD",
      grams: 120,
      goldPurity: "24K",
    },
    {
      id: 25,
      assetDetail: "Wadi Home",
      existingAllocation: 8000000,
      assetClasses_id: 5,
      assetSubClasses_id: 22,
      goals_id: 4,
      holders_id: 1,
      sip: 0,
      sipTypes_id: 1,
      buckets_id: 0,
      comments: "",
    },
    {
      id: 30,
      assetDetail: "Debt bucket",
      existingAllocation: 1200000,
      assetClasses_id: 2,
      assetSubClasses_id: 11,
      goals_id: 3,
      holders_id: 2,
      sip: 0,
      sipTypes_id: 1,
      buckets_id: 1,
      comments: "Corporate bond fund",
    },
  ];

  it("normalizes scheme names resiliently", () => {
    expect(normalizeName("Parag Parikh Flexi Cap Direct Growth")).toBe(
      normalizeName("Parag Parikh Flexi Cap Fund - Direct Plan - Growth")
    );
    expect(normalizeName("Kotak Large & Mid Cap Direct Growth")).toBe(
      normalizeName("Kotak Large & Midcap Fund - Direct- Growth")
    );
  });

  it("resolves member keys to holders accurately", () => {
    expect(resolveHolderId("swapnil", "Swapnil Bhamat", mockHolders).id).toBe(1);
    expect(resolveHolderId("prerana", "Prerana Bhamat", mockHolders, undefined, "wife").id).toBe(2);
    expect(resolveHolderId("custom_key", "Any Name", mockHolders, { custom_key: 3 }).id).toBe(3);
  });

  it("parses valid JSON with code fences", () => {
    const raw = "```json\n{\"members\": {\"swapnil\": {}}}\n```";
    const payload = parseINDMoneyPayload(raw);
    expect(payload.members).toBeDefined();
    expect(payload.members?.swapnil).toBeDefined();
  });

  it("correctly reconciles the attached INDmoney sample data", () => {
    const samplePayload = {
      meta: { fetched_on: "2026-10-24" },
      family: {
        members: [
          { key: "swapnil", name: "Swapnil Bhamat", relation_to_user: "self" },
          { key: "prerana", name: "Prerana Bhamat", relation_to_user: "wife" },
        ],
      },
      members: {
        swapnil: {
          assets: {
            mutual_fund: {
              holdings: [
                {
                  scheme_id: "3229",
                  name: "Parag Parikh Flexi Cap Direct Growth",
                  current_value: 2609653.5,
                  quantity: 29187.88,
                },
                {
                  scheme_id: "3949",
                  name: "Kotak Large & Mid Cap Direct Growth",
                  current_value: 1416024.31,
                  quantity: 3781.08,
                },
                {
                  scheme_id: "2681",
                  name: "Franklin India ELSS Tax Saver Fund Direct Growth",
                  current_value: 255726.06,
                  quantity: 171,
                },
              ],
            },
            epf: { total_value: 1927610 },
            nps: { total_value: 173124.16 },
            fixed_deposit: { total_value: 1224630.03 },
            real_estate: {
              holdings: [{ name: "Wadi Home", market_value: 8000000 }],
            },
            indian_stock: {
              holdings: [
                { name: "Reliance Power Ltd", market_value: 16.43, quantity: 1 },
              ],
            },
          },
        },
        prerana: {
          assets: {
            mutual_fund: {
              holdings: [
                {
                  scheme_id: "5041",
                  name: "Kotak Corporate Bond-Direct Plan-Growth Option",
                  current_value: 1124819.2,
                  quantity: 268.8,
                },
                {
                  scheme_id: "1004710",
                  name: "Parag Parikh ELSS Tax Saver Fund Direct Growth",
                  current_value: 470629.67,
                  quantity: 15392.73,
                },
                {
                  scheme_id: "3229",
                  name: "Parag Parikh Flexi Cap Direct Growth",
                  current_value: 266364.73,
                  quantity: 2979.18,
                },
                {
                  scheme_id: "3945",
                  name: "Kotak Mid Cap Fund Direct Growth",
                  current_value: 169506.15,
                  quantity: 1123.26,
                },
              ],
            },
          },
        },
      },
    };

    const diff = generateReconciliationDiff(samplePayload, mockHoldings, mockHolders);

    // Verify 7 mutual funds matched
    const ppfasSwapnil = diff.items.find((i) => i.holdingId === 1);
    expect(ppfasSwapnil).toBeDefined();
    expect(ppfasSwapnil?.newValue).toBe(2609653.5);
    expect(ppfasSwapnil?.newUnits).toBe(29187.88);
    expect(ppfasSwapnil?.delta).toBeCloseTo(64653.5);

    const kotakSwapnil = diff.items.find((i) => i.holdingId === 2);
    expect(kotakSwapnil).toBeDefined();
    expect(kotakSwapnil?.newValue).toBe(1416024.31);
    expect(kotakSwapnil?.newUnits).toBe(3781.08);

    const corpBondSonu = diff.items.find((i) => i.holdingId === 30);
    expect(corpBondSonu).toBeDefined();
    expect(corpBondSonu?.newValue).toBe(1124819.2);
    expect(corpBondSonu?.newUnits).toBe(268.8);

    // Verify EPF
    const epf = diff.items.find((i) => i.holdingId === 8);
    expect(epf).toBeDefined();
    expect(epf?.newValue).toBe(1927610);

    // Verify NPS
    const nps = diff.items.find((i) => i.holdingId === 7);
    expect(nps).toBeDefined();
    expect(nps?.newValue).toBe(173124.16);

    // Verify FD
    const fd = diff.items.find((i) => i.holdingId === 9);
    expect(fd).toBeDefined();
    expect(fd?.newValue).toBe(1224630.03);

    // Verify Wadi Home is unchanged
    const wadi = diff.items.find((i) => i.holdingId === 25);
    expect(wadi).toBeDefined();
    expect(wadi?.status).toBe("unchanged");

    // Verify Gold valuation updates from INDmoney
    const samplePayloadWithGold = {
      members: {
        swapnil: {
          assets: {
            gold: { total_value: 5050386 },
          },
        },
      },
    };
    const diffWithGold = generateReconciliationDiff(samplePayloadWithGold, mockHoldings, mockHolders);
    const goldItem = diffWithGold.items.find((i) => i.holdingId === 18);
    expect(goldItem).toBeDefined();
    expect(goldItem?.status).toBe("update");
    expect(goldItem?.newValue).toBe(5050386);

    // Verify custom holder map override
    const customMapDiff = generateReconciliationDiff(
      samplePayload,
      mockHoldings,
      mockHolders,
      [],
      { swapnil: 2 } // Map "swapnil" to Holder ID 2
    );
    expect(customMapDiff.detectedMembers.find((m) => m.key === "swapnil")?.resolvedHolderId).toBe(2);

    // Verify App-only assets (SSY) are preserved
    const ssy = diff.items.find((i) => i.holdingId === 11);
    expect(ssy).toBeDefined();
    expect(ssy?.status).toBe("app_only");

    // Verify New stock holding (Reliance Power) is identified as "new"
    const relPower = diff.items.find((i) => i.assetName.includes("Reliance Power"));
    expect(relPower).toBeDefined();
    expect(relPower?.status).toBe("new");
    expect(relPower?.newValue).toBe(16.43);
  });
});

