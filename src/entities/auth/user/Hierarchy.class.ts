import { Subordinate } from "./Subordinate.class";

export class Hierarchy {
  constructor(public USR: Subordinate, public Subordinates: Hierarchy[]) {}
}
