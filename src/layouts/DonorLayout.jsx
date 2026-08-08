import { FiActivity, FiHeart, FiGift, FiUser, FiDollarSign, FiPackage } from "react-icons/fi";
import DashboardLayout from "./DashboardLayout.jsx";

const donorNav = [
  { label: "Donor Dashboard", path: "/donor", icon: FiHeart },
  { label: "My Donations",    path: "/donor/donations", icon: FiDollarSign },
  { label: "My Requests",     path: "/donor/requests",  icon: FiPackage },
  { label: "Causes & Impact", path: "/donor/causes",    icon: FiGift },
  { label: "My Profile",      path: "/donor/profile",   icon: FiUser },
];

export default function DonorLayout() {
  return <DashboardLayout navItems={donorNav} role="donor" title="Donor Portal" />;
}
