"use client";

import { useState } from "react";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";

export default function Showcase() {
  const [course, setCourse] = useState("main");
  return (
    <SegmentedControl aria-label="Course" value={course} onValueChange={setCourse}>
      <Segment value="starter">Starter</Segment>
      <Segment value="main">Main</Segment>
      <Segment value="dessert">Dessert</Segment>
    </SegmentedControl>
  );
}
