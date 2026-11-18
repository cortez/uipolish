"use client";

import { useState } from "react";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import { DropdownMenu, MenuItem, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "@registry/dropdown-menu/dropdown-menu";

export default function Showcase() {
  const [sort, setSort] = useState("date");
  const [copied, setCopied] = useState(false);

  return (
    <DropdownMenu
      trigger={
        <Button variant="secondary">
          Supper club
          <Icon name="chevron-down" />
        </Button>
      }
      onOpenChange={(open) => !open && setCopied(false)}
    >
      <MenuItem icon={<Icon name={copied ? "check" : "link"} />} closeOnSelect={false} onSelect={() => setCopied(true)}>
        {copied ? "Copied" : "Copy invite link"}
      </MenuItem>
      <MenuItem icon={<Icon name="duplicate" />}>Duplicate menu</MenuItem>
      <MenuSeparator />
      <MenuRadioGroup label="Sort guests" value={sort} onValueChange={setSort}>
        <MenuRadioItem value="date">By RSVP date</MenuRadioItem>
        <MenuRadioItem value="name">By name</MenuRadioItem>
      </MenuRadioGroup>
      <MenuSeparator />
      <MenuItem icon={<Icon name="trash" />} variant="danger">
        Cancel dinner
      </MenuItem>
    </DropdownMenu>
  );
}
