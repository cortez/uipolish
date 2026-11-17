"use client";

import { PhoneInput } from "@registry/phone-input/phone-input";
import base from "./preview.module.css";

export function PhoneInputPreview() {
  return (
    <div className={base.stack}>
      <form className={base.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={base.heading}>Book club RSVP</h2>
        <PhoneInput
          label="Mobile"
          name="mobile"
          hint="Only for a text if the venue changes."
        />
        <PhoneInput label="Host’s number" defaultValue="+442079460958" defaultCountry="GB" />
        <PhoneInput label="Venue contact" defaultCountry="FR" disabled hint="Set by the venue." />
      </form>
    </div>
  );
}
