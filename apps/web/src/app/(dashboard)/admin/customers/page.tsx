"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminCustomersRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/console/customers");
  }, [router]);

  return null;
}
