import type { HoshinRepository } from "@/src/application/repository/hoshin-repository";
import { IndexedDbHoshinRepository } from "@/src/infrastructure/indexeddb/indexeddb-hoshin-repository";

let repository: HoshinRepository | null = null;

export function getHoshinRepository(): HoshinRepository {
  if (repository) {
    return repository;
  }

  repository = new IndexedDbHoshinRepository();
  return repository;
}
