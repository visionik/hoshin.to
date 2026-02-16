import type { HoshinDocument } from "@/src/domain/hoshin/models";

export interface HoshinRepository {
  upsert(document: HoshinDocument): Promise<void>;
  getById(id: string): Promise<HoshinDocument | null>;
  list(): Promise<HoshinDocument[]>;
  delete(id: string): Promise<void>;
}
