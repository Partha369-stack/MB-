# Order Flow & Lifecycle Documentation

This document describes the end-to-end order flow and the lifecycle of an order within the **MOTHER BEST** application.

---

## 1. Order Lifecycle (Statuses)

The system tracks every order using a set of strictly defined statuses. These statuses ensure that both administrators and delivery personnel are aligned on the current state of any delivery.

| Status | Description | Initiator |
| :--- | :--- | :--- |
| **`pending`** | The default status when a customer places a new order. | Customer |
| **`confirmed`** | Admin has reviewed and approved the order for fulfillment. | Admin |
| **`assigned`** | A specific delivery person has been assigned to the order. | Admin / Auto-routed |
| **`out_for_delivery`** | The delivery person has started the journey to the customer's location. | Delivery Person |
| **`delivered`** | The order has been successfully handed over to the customer (via OTP). | Delivery Person |
| **`attempted`** | Delivery was tried but failed (e.g., customer unavailable, door locked). | Delivery Person |
| **`returned`** | The order is returned to the hub/warehouse for a specific reason. | Delivery Person |
| **`cancelled`** | The order has been terminated by the admin or customer and will not be fulfilled. | Admin / Customer |

---

## 2. Order Flow: Step-by-Step

### Step 1: Order Placement
*   **Trigger**: A customer adds items to their cart and completes the checkout process.
*   **Result**: A new order is created in the database with the status **`pending`**.
*   **Visibility**: The order appears in the "All Orders" section of the **Admin Dashboard**.

### Step 2: Admin Confirmation
*   **Action**: An administrator reviews the order details (items, total, address).
*   **Status Update**: Admin clicks **"Confirm"**, transitioning the status to **`confirmed`**.

### Step 3: Assignment
*   **Action**: Admin assigns the order to a delivery person. 
    *   *Note*: If the customer has a default `assignedDeliveryPersonId`, the system may auto-route this order.
*   **Status Update**: Once assigned, the status becomes **`assigned`**.
*   **Visibility**: The order now appears in the "Upcoming Orders" section of the assigned **Delivery Dashboard**.

### Step 4: Out for Delivery
*   **Action**: The delivery person checks their "Upcoming Orders" and clicks **"Start Delivery"**.
*   **Status Update**: Status transitions to **`out_for_delivery`**.
*   **Visibility**: The order moves to the "Active Deliveries" section on the Delivery Dashboard. The customer can see that their order is on its way.

### Step 5: Final Handover (The "Moment of Truth")
The delivery person reaches the customer's location. Three outcomes are possible:

#### A. Successful Delivery
1.  **OTP Verification**: The delivery person asks the customer for their 4-digit **Delivery OTP** (visible on the customer's "Track Order" screen).
2.  **Confirmation**: Delivery person enters the OTP in their dashboard.
3.  **Status Update**: Status becomes **`delivered`**.
4.  **Payment**: If Cash on Delivery (COD), a **CODSettlement** record is automatically created for the delivery person to settle with the admin later.

#### B. Delivery Attempted
1.  **Action**: If the customer is not reachable, the delivery person clicks **"Mark Attempted"**.
2.  **Status Update**: Status becomes **`attempted`**.
3.  **Next Step**: The order stays with the delivery person for a second attempt or returns to the hub for rescheduling.

#### C. Order Returned
1.  **Action**: If the customer rejects the order or it's damaged, the delivery person clicks **"Mark Returned"**.
2.  **Constraint**: They must select or enter a **Return Reason**.
3.  **Status Update**: Status becomes **`returned`**.

---

## 3. Subscription Flow (Recurring Orders)

Subscriptions follow a slightly different initial flow but merge into the standard order flow once an instance is generated.

1.  **Subscription Setup**: Customer chooses a product, frequency (Monthly/Bi-Weekly), and a delivery date (5th, 15th, or 25th).
2.  **Order Generation**: On the scheduled date, the system (or admin) generates a **Standard Order** from the subscription details.
3.  **Lifecycle Sync**: From this point, the generated order follows the standard `pending` → `delivered` lifecycle described above.

---

## 4. Payment & COD Settlement

Since MOTHER BEST primarily uses **Cash on Delivery (COD)**:

1.  **Collection**: Upon `delivered` status, the delivery person "owns" that cash.
2.  **Pending Settlement**: The amount is added to the delivery person's "Pending COD" balance.
3.  **Settlement**: 
    *   Admin goes to **Sales Force -> Logistics -> COD Settlement**.
    *   Admin verifies the cash handed over by the delivery person.
    *   Admin clicks **"Mark Settled"**.
    *   The `CODSettlement` record status becomes **`settled`**.

---

## 5. Security & Verification

*   **OTP (One-Time Password)**: Used exclusively to move an order from `out_for_delivery` to `delivered`. This ensures the delivery person cannot fake a delivery without actually meeting the customer.
*   **Role-Based Access**: 
    *   Only **Admins** can Confirm, Cancel, or Settle.
    *   Only **Delivery Person** can Start Delivery or Verify OTP.
