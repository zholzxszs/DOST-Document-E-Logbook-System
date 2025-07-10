-- Enums
CREATE TYPE user_type AS ENUM ('admin', 'superadmin');
CREATE TYPE route_enum AS ENUM ('Accounting Unit', 'ORD', 'For Compliance');
CREATE TYPE time_enum AS ENUM ('AM', 'PM', 'PM Late');
CREATE TYPE documentdirection_enum AS ENUM ('incoming', 'outgoing', 'all');

-- Tables
CREATE TABLE tbladmin (
  adminid SERIAL PRIMARY KEY,
  adminname VARCHAR(30) UNIQUE NOT NULL,
  adminemail VARCHAR(30) UNIQUE NOT NULL,
  adminpass VARCHAR(20) NOT NULL,
  usertype user_type NOT NULL,
  documentdirection documentdirection_enum,
  datecreated DATE DEFAULT CURRENT_DATE,
  archivedate VARCHAR(50),
  isarchive BOOLEAN DEFAULT FALSE
);

CREATE TABLE tbldocumenttype (
  documentid SERIAL PRIMARY KEY,
  documenttype VARCHAR(40)
);

CREATE TABLE tbldocuments (
  documentid SERIAL PRIMARY KEY,
  datesent TIMESTAMPTZ DEFAULT NOW(),
  dtsno VARCHAR(15) NOT NULL,
  documenttype VARCHAR(30) NOT NULL,
  datereleased VARCHAR(50),
  time time_enum,
  route route_enum,
  remarks TEXT,
  isarchive BOOLEAN,
  documentdirection documentdirection_enum,
  networkdaysremarks TEXT,
  deducteddays INTEGER DEFAULT 0,
  calcnetworkdays INTEGER DEFAULT 0,
  archivedate VARCHAR(50),
  archivedby VARCHAR(50)
);

-- Function to calculate network days
CREATE OR REPLACE FUNCTION calculate_network_days()
RETURNS TRIGGER AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
BEGIN
  -- Parse the start and end dates
  start_date := NEW.datesent;
  end_date := TO_TIMESTAMP(NEW.datereleased, 'FMMonth DD, YYYY "at" HH12:MI AM');

  -- Calculate working days (Mon–Fri only)
  NEW.calcnetworkdays := GREATEST(
    (
      SELECT COUNT(*) FROM generate_series(start_date::date, end_date::date, INTERVAL '1 day') AS d(day)
      WHERE EXTRACT(DOW FROM d.day) BETWEEN 1 AND 5  -- 1=Monday, 5=Friday
    ) - COALESCE(NEW.deducteddays, 0),
    0
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before insert or update
CREATE TRIGGER trg_calculate_network_days
BEFORE INSERT OR UPDATE ON tbldocuments
FOR EACH ROW
EXECUTE FUNCTION calculate_network_days();

-- Initial data for tbladmin
INSERT INTO public.tbladmin (
    adminid, adminname, adminemail, adminpass, usertype, 
    documentdirection, datecreated, archivedate, isarchive
) VALUES 
(1, 'Sheriel Mae Gapasin', 'spgapasin@region1.dost.gov.ph', '123', 'admin', 'outgoing', '2025-06-22', NULL, false),
(2, 'John Louie Dalao', 'jadalao@region1.dost.gov.ph', '123', 'admin', 'incoming', '2025-06-22', NULL, false),
(3, 'Justin Madrid', 'jmadrid@region1.dost.gov.ph', '123', 'superadmin', 'all', '2025-06-22', NULL, false);

-- Initial data for tbldocumenttype
INSERT INTO public.tbldocumenttype (documenttype) VALUES 
('Disbursement Voucher'), 
('Payroll'), 
('Application for Leave'), 
('Budget or Activity Proposal');